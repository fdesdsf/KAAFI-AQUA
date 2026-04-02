package com.kaafi.aqua.service;

import com.kaafi.aqua.model.Filter;
import com.kaafi.aqua.model.FilterMaintenanceLog;
import com.kaafi.aqua.repository.FilterRepository;
import com.kaafi.aqua.repository.FilterMaintenanceLogRepository;
import com.kaafi.aqua.enums.FilterStatus;
import com.kaafi.aqua.util.ActivityLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FilterService {
    
    private final FilterRepository filterRepository;
    private final FilterMaintenanceLogRepository maintenanceLogRepository;
    private final ActivityLogger activityLogger;
    
    // FIXED: Just fetch, don't auto-update
    public List<Filter> getAllFilters() {
        return filterRepository.findAll();
    }
    
    // FIXED: Just fetch, don't call updateFilterPercentage
    public Filter getFilterById(Long id) {
        return filterRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Filter not found with id: " + id));
    }
    
    // FIXED: Just fetch by status (percentage should be updated by scheduled job)
    public List<Filter> getFiltersByStatus(FilterStatus status) {
        return filterRepository.findByStatus(status);
    }
    
    // FIXED: Just fetch
    public List<Filter> getCriticalFilters() {
        return filterRepository.findCriticalFilters();
    }
    
    // FIXED: Just fetch
    public List<Filter> getWarningFilters() {
        return filterRepository.findWarningFilters();
    }
    
    // FIXED: Just calculate stats from current data
    public Map<String, Object> getFilterDashboardStats() {
        List<Filter> allFilters = filterRepository.findAll();
        List<Filter> critical = getCriticalFilters();
        List<Filter> warning = getWarningFilters();
        
        double overallHealth = allFilters.stream()
            .mapToInt(Filter::getPercentage)
            .average()
            .orElse(0.0);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalFilters", allFilters.size());
        stats.put("criticalCount", critical.size());
        stats.put("warningCount", warning.size());
        stats.put("goodCount", allFilters.size() - critical.size() - warning.size());
        stats.put("overallHealth", Math.round(overallHealth));
        
        return stats;
    }
    
    private int calculatePercentage(LocalDate lastChanged, int lifespan) {
        if (lastChanged == null) {
            return 0;
        }
        long daysSinceChange = ChronoUnit.DAYS.between(lastChanged, LocalDate.now());
        int percentage = Math.max(0, 100 - (int)(daysSinceChange * (100.0 / lifespan)));
        return Math.min(100, percentage);
    }
    
    private FilterStatus calculateStatus(int percentage) {
        if (percentage > 70) {
            return FilterStatus.GOOD;
        } else if (percentage > 30) {
            return FilterStatus.WARNING;
        } else {
            return FilterStatus.CRITICAL;
        }
    }
    
    // FIXED: Use repository directly instead of calling getFilterById
    @Transactional
    public void updateFilterPercentage(Long filterId) {
        Filter filter = filterRepository.findById(filterId)
            .orElseThrow(() -> new RuntimeException("Filter not found with id: " + filterId));
        
        int newPercentage = calculatePercentage(filter.getLastChanged(), filter.getLifespan());
        FilterStatus newStatus = calculateStatus(newPercentage);
        
        filter.setPercentage(newPercentage);
        filter.setStatus(newStatus);
        filterRepository.save(filter);
        
        log.info("Updated filter {}: {}% - {}", filter.getName(), newPercentage, newStatus);
    }
    
    @Transactional
    public void updateAllFilterPercentages() {
        List<Filter> filters = filterRepository.findAll();
        for (Filter filter : filters) {
            int newPercentage = calculatePercentage(filter.getLastChanged(), filter.getLifespan());
            FilterStatus newStatus = calculateStatus(newPercentage);
            
            filter.setPercentage(newPercentage);
            filter.setStatus(newStatus);
        }
        filterRepository.saveAll(filters);
        log.info("Updated all filter percentages. Total filters: {}", filters.size());
    }
    
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void scheduledFilterPercentageUpdate() {
        log.info("Running scheduled filter percentage update...");
        updateAllFilterPercentages();
        log.info("Filter percentage update completed.");
    }
    
    @Transactional
    public Filter replaceFilter(Long id, String technician, String notes, String performedBy) {
        Filter filter = getFilterById(id);
        
        filter.setLastChanged(LocalDate.now());
        filter.setPercentage(100);
        filter.setStatus(FilterStatus.GOOD);
        
        Filter updatedFilter = filterRepository.save(filter);
        
        FilterMaintenanceLog maintenanceLog = new FilterMaintenanceLog();
        maintenanceLog.setFilterName(filter.getName());
        maintenanceLog.setAction("Replaced");
        maintenanceLog.setTechnician(technician);
        maintenanceLog.setMaintenanceDate(LocalDate.now());
        maintenanceLog.setNotes(notes != null ? notes : "Filter replaced - reset to 100%");
        maintenanceLogRepository.save(maintenanceLog);
        
        activityLogger.log(performedBy, "REPLACE_FILTER", "Filter", id, 
            "Replaced filter: " + filter.getName() + " by " + technician);
        
        log.info("Filter {} replaced. Set to 100%", filter.getName());
        return updatedFilter;
    }
    
    @Transactional
    public Filter updateFilterStatus(Long id, FilterStatus status, Integer percentage, String updatedBy) {
        Filter filter = getFilterById(id);
        
        if (status == FilterStatus.GOOD && percentage >= 100) {
            filter.setLastChanged(LocalDate.now());
            filter.setPercentage(100);
            filter.setStatus(FilterStatus.GOOD);
        } else {
            filter.setStatus(status);
            filter.setPercentage(percentage);
        }
        
        Filter updatedFilter = filterRepository.save(filter);
        
        Long filterId = filter.getId() != null ? filter.getId() : 0L;
        activityLogger.log(updatedBy, "UPDATE_FILTER", "Filter", filterId, 
            "Updated filter: " + filter.getName() + " to status: " + status + ", percentage: " + percentage);
        
        return updatedFilter;
    }
    
    @Transactional
    public FilterMaintenanceLog addMaintenanceLog(String filterName, String action, String technician, String maintenanceDate, String notes, String performedBy) {
        FilterMaintenanceLog maintenanceLog = new FilterMaintenanceLog();
        maintenanceLog.setFilterName(filterName);
        maintenanceLog.setAction(action);
        maintenanceLog.setTechnician(technician);
        if (maintenanceDate != null && !maintenanceDate.isEmpty()) {
            maintenanceLog.setMaintenanceDate(LocalDate.parse(maintenanceDate));
        } else {
            maintenanceLog.setMaintenanceDate(LocalDate.now());
        }
        maintenanceLog.setNotes(notes);
        
        FilterMaintenanceLog savedLog = maintenanceLogRepository.save(maintenanceLog);
        
        if ("Replaced".equalsIgnoreCase(action)) {
            List<Filter> filters = filterRepository.findAll();
            filters.stream()
                .filter(f -> f.getName().equalsIgnoreCase(filterName))
                .findFirst()
                .ifPresent(filter -> {
                    filter.setLastChanged(LocalDate.now());
                    filter.setPercentage(100);
                    filter.setStatus(FilterStatus.GOOD);
                    filterRepository.save(filter);
                    log.info("Filter {} last_changed updated to today", filterName);
                });
        }
        
        activityLogger.log(performedBy, "ADD_MAINTENANCE_LOG", "Filter", null, 
            "Added maintenance log for filter: " + filterName + " - " + action);
        
        return savedLog;
    }
    
    public List<FilterMaintenanceLog> getMaintenanceLogs() {
        return maintenanceLogRepository.findAllByOrderByMaintenanceDateDesc();
    }
    
    public List<FilterMaintenanceLog> getMaintenanceLogsByFilter(String filterName) {
        return maintenanceLogRepository.findByFilterNameOrderByMaintenanceDateDesc(filterName);
    }
    
    // ========== NEW ADMIN CRUD METHODS ==========
    
    @Transactional
    public Filter createFilter(Filter filter) {
        // Set default values if not provided
        if (filter.getLastChanged() == null) {
            filter.setLastChanged(LocalDate.now());
        }
        if (filter.getPercentage() == null) {
            filter.setPercentage(100);
        }
        if (filter.getStatus() == null) {
            filter.setStatus(FilterStatus.GOOD);
        }
        if (filter.getActive() == null) {
            filter.setActive(true);
        }
        
        Filter savedFilter = filterRepository.save(filter);
        activityLogger.log("SYSTEM", "CREATE_FILTER", "Filter", savedFilter.getId(), 
            "Created new filter: " + savedFilter.getName());
        log.info("Created new filter: {} with ID: {}", savedFilter.getName(), savedFilter.getId());
        return savedFilter;
    }
    
    @Transactional
    public Filter updateFilter(Long id, Filter filterDetails) {
        Filter existingFilter = getFilterById(id);
        
        // Update only non-null fields
        if (filterDetails.getName() != null) {
            existingFilter.setName(filterDetails.getName());
        }
        if (filterDetails.getType() != null) {
            existingFilter.setType(filterDetails.getType());
        }
        if (filterDetails.getLifespan() != null) {
            existingFilter.setLifespan(filterDetails.getLifespan());
        }
        if (filterDetails.getDescription() != null) {
            existingFilter.setDescription(filterDetails.getDescription());
        }
        
        Filter updatedFilter = filterRepository.save(existingFilter);
        activityLogger.log("SYSTEM", "UPDATE_FILTER", "Filter", id, 
            "Updated filter: " + updatedFilter.getName());
        log.info("Updated filter with ID: {}", id);
        return updatedFilter;
    }
    
    @Transactional
    public void deleteFilter(Long id) {
        Filter filter = getFilterById(id);
        String filterName = filter.getName();
        filterRepository.delete(filter);
        activityLogger.log("SYSTEM", "DELETE_FILTER", "Filter", id, 
            "Deleted filter: " + filterName);
        log.info("Deleted filter: {} with ID: {}", filterName, id);
    }
    
    @Transactional
    public Filter toggleFilterStatus(Long id) {
        Filter filter = getFilterById(id);
        
        // Toggle between ACTIVE and INACTIVE
        if (filter.getActive() == null || filter.getActive()) {
            filter.setActive(false);
            log.info("Deactivated filter: {}", filter.getName());
        } else {
            filter.setActive(true);
            log.info("Activated filter: {}", filter.getName());
        }
        
        Filter updatedFilter = filterRepository.save(filter);
        activityLogger.log("SYSTEM", "TOGGLE_FILTER_STATUS", "Filter", id, 
            "Toggled filter status for: " + filter.getName() + " to active: " + filter.getActive());
        return updatedFilter;
    }
}