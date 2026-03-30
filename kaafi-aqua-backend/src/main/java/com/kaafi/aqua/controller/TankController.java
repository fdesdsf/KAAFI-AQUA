package com.kaafi.aqua.controller;

import com.kaafi.aqua.dto.request.CapacityUpdateRequest;
import com.kaafi.aqua.dto.request.LevelUpdateRequest;
import com.kaafi.aqua.dto.request.TankInitRequest;
import com.kaafi.aqua.dto.request.TankRestockRequest;
import com.kaafi.aqua.dto.response.ApiResponse;
import com.kaafi.aqua.model.TankLevel;
import com.kaafi.aqua.model.TankRestockHistory;
import com.kaafi.aqua.model.TankUsageHistory;
import com.kaafi.aqua.service.TankService;
import com.kaafi.aqua.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tank")
@RequiredArgsConstructor
public class TankController {
    
    private final TankService tankService;
    private final JwtTokenProvider tokenProvider;
    
    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<TankLevel>> getCurrentTankLevel() {
        TankLevel tankLevel = tankService.getCurrentTankLevel();
        return ResponseEntity.ok(ApiResponse.success(tankLevel));
    }
    
    @PostMapping("/restock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TankLevel>> restockTank(
            @Valid @RequestBody TankRestockRequest request,
            HttpServletRequest httpRequest) {
        String restockedBy = getCurrentUser(httpRequest);
        TankLevel updatedTank = tankService.restockTank(request, restockedBy);
        return ResponseEntity.ok(ApiResponse.success("Tank restocked successfully", updatedTank));
    }
    
    @PostMapping("/initialize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TankLevel>> initializeTank(
            @Valid @RequestBody TankInitRequest request,
            HttpServletRequest httpRequest) {
        String initializedBy = getCurrentUser(httpRequest);
        TankLevel tank = tankService.initializeTank(request, initializedBy);
        return ResponseEntity.ok(ApiResponse.success("Tank initialized successfully", tank));
    }
    
    @PutMapping("/capacity")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TankLevel>> updateCapacity(
            @Valid @RequestBody CapacityUpdateRequest request,
            HttpServletRequest httpRequest) {
        String updatedBy = getCurrentUser(httpRequest);
        TankLevel tank = tankService.updateCapacity(request, updatedBy);
        return ResponseEntity.ok(ApiResponse.success("Tank capacity updated successfully", tank));
    }
    
    @PutMapping("/level")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TankLevel>> updateLevel(
            @Valid @RequestBody LevelUpdateRequest request,
            HttpServletRequest httpRequest) {
        String updatedBy = getCurrentUser(httpRequest);
        TankLevel tank = tankService.updateLevel(request, updatedBy);
        return ResponseEntity.ok(ApiResponse.success("Water level updated successfully", tank));
    }
    
    @GetMapping("/usage-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<TankUsageHistory>>> getTankUsageHistory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<TankUsageHistory> history = tankService.getTankUsageHistory(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(history));
    }
    
    @GetMapping("/usage/last7days")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<TankUsageHistory>>> getLast7DaysUsage() {
        List<TankUsageHistory> history = tankService.getLast7DaysUsage();
        return ResponseEntity.ok(ApiResponse.success(history));
    }
    
    @GetMapping("/usage/average")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Double>> getAverageDailyUsage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Double average = tankService.getAverageDailyUsage(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(average));
    }
    
    @GetMapping("/restock-history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TankRestockHistory>>> getRestockHistory() {
        List<TankRestockHistory> history = tankService.getRestockHistory();
        return ResponseEntity.ok(ApiResponse.success(history));
    }
    
    // ADD THIS NEW ENDPOINT - Waste information
    @GetMapping("/waste-info")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWasteInfo() {
        Map<String, Object> wasteInfo = tankService.getWasteInfo();
        return ResponseEntity.ok(ApiResponse.success(wasteInfo));
    }
    
    private String getCurrentUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return tokenProvider.getUsernameFromToken(token);
        }
        return "system";
    }
}