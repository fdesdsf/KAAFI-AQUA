package com.kaafi.aqua.controller;

import com.kaafi.aqua.dto.request.SaleRequest;
import com.kaafi.aqua.dto.request.UpdateSaleRequest;
import com.kaafi.aqua.dto.response.ApiResponse;
import com.kaafi.aqua.dto.response.SaleResponse;
import com.kaafi.aqua.service.SaleService;
import com.kaafi.aqua.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
public class SaleController {
    
    private final SaleService saleService;
    private final JwtTokenProvider tokenProvider;
    
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<SaleResponse>> createSale(
            @Valid @RequestBody SaleRequest request,
            HttpServletRequest httpRequest) {
        String staffName = getCurrentUser(httpRequest);
        SaleResponse sale = saleService.createSale(request, staffName);
        return ResponseEntity.ok(ApiResponse.success("Sale completed successfully", sale));
    }
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getAllSales() {
        log.info("Fetching all sales for the last 30 days");
        List<SaleResponse> sales = saleService.getSalesBetweenDates(
            LocalDate.now().minusDays(30), 
            LocalDate.now()
        );
        return ResponseEntity.ok(ApiResponse.success("Sales fetched successfully", sales));
    }
    
    // ✅ UPDATED - Update sale (Admin only) - Changed from /admin/sales/{id} to /admin/{id}
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SaleResponse>> updateSale(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSaleRequest request) {
        log.info("Updating sale with id: {}", id);
        SaleResponse updatedSale = saleService.updateSale(id, request);
        return ResponseEntity.ok(ApiResponse.success("Sale updated successfully", updatedSale));
    }
    
    // ✅ UPDATED - Delete sale (Admin only) - Changed from /admin/sales/{id} to /admin/{id}
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSale(@PathVariable Long id) {
        log.info("Deleting sale with id: {}", id);
        saleService.deleteSale(id);
        return ResponseEntity.ok(ApiResponse.success("Sale deleted successfully", null));
    }
    
    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getTodaySales() {
        List<SaleResponse> sales = saleService.getTodaySales();
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getSalesByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<SaleResponse> sales = saleService.getSalesByDate(date);
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/between")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getSalesBetweenDates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<SaleResponse> sales = saleService.getSalesBetweenDates(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/between/paginated")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Page<SaleResponse>>> getSalesBetweenDatesPaginated(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SaleResponse> sales = saleService.getSalesBetweenDatesPaginated(startDate, endDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/staff/{staffName}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getSalesByStaff(@PathVariable String staffName) {
        List<SaleResponse> sales = saleService.getSalesByStaff(staffName);
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/my-sales")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getMySales(HttpServletRequest httpRequest) {
        String staffName = getCurrentUser(httpRequest);
        List<SaleResponse> sales = saleService.getSalesByStaff(staffName);
        return ResponseEntity.ok(ApiResponse.success(sales));
    }
    
    @GetMapping("/stats/today")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Object>> getTodayStats() {
        Long count = saleService.getTodaySalesCount();
        java.math.BigDecimal revenue = saleService.getTodayRevenue();
        
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("count", count);
        stats.put("revenue", revenue);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    @GetMapping("/stats/sales-by-size")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<Object[]>>> getSalesBySize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<Object[]> salesBySize = saleService.getSalesBySizeBetweenDates(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(salesBySize));
    }
    
    private String getCurrentUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return tokenProvider.getUsernameFromToken(token);
        }
        return "anonymous";
    }
}