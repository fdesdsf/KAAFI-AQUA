package com.kaafi.aqua.service;

import com.kaafi.aqua.dto.request.CapacityUpdateRequest;
import com.kaafi.aqua.dto.request.LevelUpdateRequest;
import com.kaafi.aqua.dto.request.TankInitRequest;
import com.kaafi.aqua.dto.request.TankRestockRequest;
import com.kaafi.aqua.dto.response.DashboardStatsResponse;
import com.kaafi.aqua.model.TankLevel;
import com.kaafi.aqua.model.TankRestockHistory;
import com.kaafi.aqua.model.TankUsageHistory;
import com.kaafi.aqua.repository.TankLevelRepository;
import com.kaafi.aqua.repository.TankRestockHistoryRepository;
import com.kaafi.aqua.repository.TankUsageHistoryRepository;
import com.kaafi.aqua.util.ActivityLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TankService {
    
    private final TankLevelRepository tankLevelRepository;
    private final TankUsageHistoryRepository usageHistoryRepository;
    private final TankRestockHistoryRepository restockHistoryRepository;
    private final ActivityLogger activityLogger;
    
    private static final double WASTE_PERCENTAGE = 0.20; // 20% waste
    
    public TankLevel getCurrentTankLevel() {
        return tankLevelRepository.findTopByOrderByIdDesc()
            .orElseGet(() -> {
                log.warn("No tank level found. Creating default tank level...");
                TankLevel defaultTank = new TankLevel();
                defaultTank.setCurrentLevel(2850);
                defaultTank.setTankCapacity(5000);
                defaultTank.setNotes("Auto-created default tank");
                TankLevel savedTank = tankLevelRepository.save(defaultTank);
                log.info("Default tank level created: {}L out of {}L", savedTank.getCurrentLevel(), savedTank.getTankCapacity());
                return savedTank;
            });
    }
    
    @Transactional
    public TankLevel restockTank(TankRestockRequest request, String restockedBy) {
        TankLevel currentTank = getCurrentTankLevel();
        
        int previousLevel = currentTank.getCurrentLevel();
        int capacity = currentTank.getTankCapacity();
        int potentialNewLevel = previousLevel + request.getAmountLiters();
        
        // CHECK IF RESTOCK WILL FILL TO FULL CAPACITY
        int newLevel;
        String wasteNote = "";
        
        if (potentialNewLevel >= capacity) {
            // Calculate 20% waste deduction when filling to full
            int wasteAmount = (int) Math.round(capacity * WASTE_PERCENTAGE);
            int effectiveLevel = capacity - wasteAmount;
            
            newLevel = effectiveLevel;
            wasteNote = String.format(" [WASTE: %dL (20%%) deducted from full capacity]", wasteAmount);
            
            log.warn("=== TANK WASTE DEDUCTION ON RESTOCK ===");
            log.warn("Restock would fill to {}L capacity", capacity);
            log.warn("20%% waste deducted: {}L", wasteAmount);
            log.warn("Effective water level: {}L", effectiveLevel);
            log.warn("Previous level: {}L, Restock amount: {}L", previousLevel, request.getAmountLiters());
        } else {
            newLevel = potentialNewLevel;
        }
        
        currentTank.setCurrentLevel(newLevel);
        currentTank.setUpdatedBy(restockedBy);
        String finalNotes = request.getNotes() != null ? request.getNotes() + wasteNote : wasteNote.trim();
        currentTank.setNotes(finalNotes);
        TankLevel updatedTank = tankLevelRepository.save(currentTank);
        
        TankRestockHistory history = new TankRestockHistory();
        history.setAmountLiters(request.getAmountLiters());
        history.setPreviousLevel(previousLevel);
        history.setNewLevel(newLevel);
        history.setRestockedBy(restockedBy);
        history.setNotes(finalNotes);
        restockHistoryRepository.save(history);
        
        activityLogger.log(restockedBy, "RESTOCK_TANK", "Tank", currentTank.getId(), 
            "Restocked " + request.getAmountLiters() + "L. Previous: " + previousLevel + "L, New: " + newLevel + "L" + wasteNote);
        
        return updatedTank;
    }
    
    @Transactional
    public TankLevel initializeTank(TankInitRequest request, String initializedBy) {
        log.info("Initializing new tank with capacity: {}L, current level: {}L by: {}", 
            request.getTankCapacity(), request.getCurrentLevel(), initializedBy);
        
        // Validate
        if (request.getCurrentLevel() > request.getTankCapacity()) {
            throw new RuntimeException("Current level cannot exceed tank capacity");
        }
        
        // Apply waste deduction if initializing at full capacity
        int finalLevel = request.getCurrentLevel();
        String wasteNote = "";
        
        if (request.getCurrentLevel() >= request.getTankCapacity()) {
            int wasteAmount = (int) Math.round(request.getTankCapacity() * WASTE_PERCENTAGE);
            finalLevel = request.getTankCapacity() - wasteAmount;
            wasteNote = String.format(" [WASTE: %dL (20%%) deducted from full capacity on initialization]", wasteAmount);
            
            log.warn("=== TANK WASTE DEDUCTION ON INITIALIZATION ===");
            log.warn("Initialized at full capacity: {}L", request.getTankCapacity());
            log.warn("20%% waste deducted: {}L", wasteAmount);
            log.warn("Effective water level: {}L", finalLevel);
        }
        
        // Create new tank record
        TankLevel newTank = new TankLevel();
        newTank.setCurrentLevel(finalLevel);
        newTank.setTankCapacity(request.getTankCapacity());
        newTank.setUpdatedBy(initializedBy);
        newTank.setNotes((request.getNotes() != null ? request.getNotes() : "") + wasteNote);
        
        TankLevel savedTank = tankLevelRepository.save(newTank);
        
        activityLogger.log(initializedBy, "INITIALIZE_TANK", "TankLevel", savedTank.getId(),
            "Tank initialized with capacity: " + request.getTankCapacity() + "L, current level: " + finalLevel + "L" + wasteNote);
        
        log.info("Tank initialized successfully with ID: {}", savedTank.getId());
        return savedTank;
    }
    
    @Transactional
    public TankLevel updateCapacity(CapacityUpdateRequest request, String updatedBy) {
        TankLevel currentTank = getCurrentTankLevel();
        
        log.info("Updating tank capacity from {}L to {}L by: {}", 
            currentTank.getTankCapacity(), request.getTankCapacity(), updatedBy);
        
        // Validate new capacity
        if (request.getTankCapacity() < currentTank.getCurrentLevel()) {
            throw new RuntimeException("Cannot set capacity below current water level (" + 
                currentTank.getCurrentLevel() + "L). Please reduce water level first.");
        }
        
        currentTank.setTankCapacity(request.getTankCapacity());
        currentTank.setUpdatedBy(updatedBy);
        if (request.getNotes() != null) {
            currentTank.setNotes(request.getNotes());
        }
        
        TankLevel updatedTank = tankLevelRepository.save(currentTank);
        
        activityLogger.log(updatedBy, "UPDATE_TANK_CAPACITY", "TankLevel", updatedTank.getId(),
            "Updated tank capacity from " + currentTank.getTankCapacity() + "L to: " + request.getTankCapacity() + "L");
        
        log.info("Tank capacity updated successfully to: {}L", request.getTankCapacity());
        return updatedTank;
    }
    
    @Transactional
    public TankLevel updateLevel(LevelUpdateRequest request, String updatedBy) {
        TankLevel currentTank = getCurrentTankLevel();
        
        log.info("Updating water level from {}L to {}L by: {}", 
            currentTank.getCurrentLevel(), request.getCurrentLevel(), updatedBy);
        
        // Validate new level
        if (request.getCurrentLevel() < 0) {
            throw new RuntimeException("Water level cannot be negative");
        }
        if (request.getCurrentLevel() > currentTank.getTankCapacity()) {
            throw new RuntimeException("Water level cannot exceed tank capacity of " + 
                currentTank.getTankCapacity() + "L");
        }
        
        int previousLevel = currentTank.getCurrentLevel();
        int capacity = currentTank.getTankCapacity();
        String wasteNote = "";
        
        // CHECK IF UPDATING TO FULL CAPACITY
        int finalLevel = request.getCurrentLevel();
        
        if (request.getCurrentLevel() >= capacity && previousLevel < capacity) {
            // Calculate 20% waste deduction when setting to full capacity
            int wasteAmount = (int) Math.round(capacity * WASTE_PERCENTAGE);
            finalLevel = capacity - wasteAmount;
            wasteNote = String.format(" [WASTE: %dL (20%%) deducted from full capacity]", wasteAmount);
            
            log.warn("=== TANK WASTE DEDUCTION ON LEVEL UPDATE ===");
            log.warn("Level update to full capacity: {}L", capacity);
            log.warn("20%% waste deducted: {}L", wasteAmount);
            log.warn("Effective water level: {}L", finalLevel);
            log.warn("Previous level: {}L", previousLevel);
        }
        
        currentTank.setCurrentLevel(finalLevel);
        currentTank.setUpdatedBy(updatedBy);
        
        String finalNotes = request.getNotes() != null ? request.getNotes() + wasteNote : wasteNote.trim();
        if (request.getNotes() != null || !wasteNote.isEmpty()) {
            currentTank.setNotes(finalNotes);
        }
        
        TankLevel updatedTank = tankLevelRepository.save(currentTank);
        
        // Record this as a restock if level increased, or usage if decreased
        if (finalLevel > previousLevel) {
            TankRestockHistory history = new TankRestockHistory();
            history.setAmountLiters(finalLevel - previousLevel);
            history.setPreviousLevel(previousLevel);
            history.setNewLevel(finalLevel);
            history.setRestockedBy(updatedBy);
            history.setNotes(finalNotes);
            restockHistoryRepository.save(history);
        }
        
        activityLogger.log(updatedBy, "UPDATE_TANK_LEVEL", "TankLevel", updatedTank.getId(),
            "Updated water level from " + previousLevel + "L to: " + finalLevel + "L" + wasteNote);
        
        log.info("Water level updated successfully to: {}L", finalLevel);
        return updatedTank;
    }
    
    public List<TankUsageHistory> getTankUsageHistory(LocalDate startDate, LocalDate endDate) {
        return usageHistoryRepository.findByDateBetween(startDate, endDate);
    }
    
    // FIXED: Added Pageable to limit results to last 7 days
    public List<TankUsageHistory> getLast7DaysUsage() {
        Pageable pageable = PageRequest.of(0, 7);
        return usageHistoryRepository.findLast7Days(pageable);
    }
    
    public Double getAverageDailyUsage(LocalDate startDate, LocalDate endDate) {
        Double avg = usageHistoryRepository.getAverageDailyUsage(startDate, endDate);
        return avg != null ? avg : 0.0;
    }
    
    public List<TankRestockHistory> getRestockHistory() {
        return restockHistoryRepository.findAllByOrderByRestockDateDesc();
    }
    
    public DashboardStatsResponse.TankStats getTankStats() {
        TankLevel tank = getCurrentTankLevel();
        
        return DashboardStatsResponse.TankStats.builder()
            .currentLevel(tank.getCurrentLevel())
            .capacity(tank.getTankCapacity())
            .percentage(tank.getPercentage())
            .status(tank.getStatus() != null ? tank.getStatus().getDisplayName() : "Good")
            .build();
    }
    public Map<String, Object> getWasteInfo() {
    TankLevel tank = getCurrentTankLevel();
    Map<String, Object> wasteInfo = new HashMap<>();
    wasteInfo.put("wastePercentage", 20);
    wasteInfo.put("fullCapacity", tank.getTankCapacity());
    wasteInfo.put("wasteAmountOnFull", (int) Math.round(tank.getTankCapacity() * 0.20));
    wasteInfo.put("effectiveLevelWhenFull", tank.getTankCapacity() - (int) Math.round(tank.getTankCapacity() * 0.20));
    wasteInfo.put("currentLevel", tank.getCurrentLevel());
    wasteInfo.put("currentCapacity", tank.getTankCapacity());
    return wasteInfo;
}
}