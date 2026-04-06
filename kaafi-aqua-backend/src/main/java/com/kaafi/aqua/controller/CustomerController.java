package com.kaafi.aqua.controller;

import com.kaafi.aqua.dto.response.ApiResponse;
import com.kaafi.aqua.model.Customer;
import com.kaafi.aqua.service.CustomerService;
import com.kaafi.aqua.service.SaleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {
    
    private final CustomerService customerService;
    private final SaleService saleService; // Add SaleService dependency
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<Customer>>> getAllCustomers() {
        List<Customer> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(ApiResponse.success(customers));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Customer>> getCustomerById(@PathVariable Long id) {
        Customer customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(ApiResponse.success(customer));
    }
    
    @GetMapping("/inactive/{days}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<Customer>>> getInactiveCustomers(@PathVariable int days) {
        List<Customer> customers = customerService.getInactiveCustomers(days);
        return ResponseEntity.ok(ApiResponse.success(customers));
    }
    
    @GetMapping("/credit")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<Customer>>> getCustomersWithCredit() {
        List<Customer> customers = customerService.getCustomersWithCredit();
        return ResponseEntity.ok(ApiResponse.success(customers));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Customer>> createCustomer(@Valid @RequestBody Customer customer) {
        Customer createdCustomer = customerService.createCustomer(customer);
        return ResponseEntity.ok(ApiResponse.success("Customer created successfully", createdCustomer));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Customer>> updateCustomer(@PathVariable Long id, @Valid @RequestBody Customer customer) {
        Customer updatedCustomer = customerService.updateCustomer(id, customer);
        return ResponseEntity.ok(ApiResponse.success("Customer updated successfully", updatedCustomer));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully", null));
    }
    
    // ENHANCED: Record credit payment for a customer with automatic sale status update
    @PostMapping("/{id}/pay-credit")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> payCredit(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        
        // Get current user for logging
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        
        // Extract amount (can be BigDecimal, Integer, Double, etc.)
        BigDecimal amount;
        Object amountObj = request.get("amount");
        
        if (amountObj == null) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Payment amount is required"));
        }
        
        // Handle different number types
        if (amountObj instanceof BigDecimal) {
            amount = (BigDecimal) amountObj;
        } else if (amountObj instanceof Number) {
            amount = BigDecimal.valueOf(((Number) amountObj).doubleValue());
        } else if (amountObj instanceof String) {
            try {
                amount = new BigDecimal((String) amountObj);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid payment amount format"));
            }
        } else {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid payment amount format"));
        }
        
        // Check if we should update pending sales (default: true)
        boolean updatePendingSales = request.containsKey("updatePendingSales") ? 
            (Boolean) request.get("updatePendingSales") : true;
        
        // Validate amount
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid payment amount. Amount must be greater than 0"));
        }
        
        // Get customer to check current balance
        Customer customer = customerService.getCustomerById(id);
        
        // Check if amount exceeds credit balance
        if (customer.getCreditBalance().compareTo(amount) < 0) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Payment amount exceeds credit balance. Current balance: KES " + customer.getCreditBalance()));
        }
        
        // Calculate new balance
        BigDecimal previousBalance = customer.getCreditBalance();
        BigDecimal newBalance = previousBalance.subtract(amount);
        
        // Update customer credit balance
        customer.setCreditBalance(newBalance);
        customerService.updateCustomer(id, customer);
        
        log.info("Payment of KES {} recorded for customer {} (ID: {}). Balance: {} -> {}", 
            amount, customer.getName(), id, previousBalance, newBalance);
        
        // If balance becomes zero and updatePendingSales is true, update pending sales
        int updatedSalesCount = 0;
        if (updatePendingSales && newBalance.compareTo(BigDecimal.ZERO) == 0) {
            try {
                updatedSalesCount = saleService.updateAllPendingCreditSalesToCompleted(id, username);
                log.info("Updated {} pending credit sales to COMPLETED for customer {} (ID: {})", 
                    updatedSalesCount, customer.getName(), id);
            } catch (Exception e) {
                log.error("Failed to update pending sales for customer {}: {}", id, e.getMessage(), e);
                // Don't fail the payment if sale update fails, but log the error
            }
        }
        
        // Prepare response
        Map<String, Object> response = new HashMap<>();
        response.put("customerId", id);
        response.put("customerName", customer.getName());
        response.put("amountPaid", amount);
        response.put("previousBalance", previousBalance);
        response.put("newBalance", newBalance);
        response.put("updatedSalesCount", updatedSalesCount);
        response.put("balanceCleared", newBalance.compareTo(BigDecimal.ZERO) == 0);
        response.put("hasPendingSales", saleService.hasPendingCreditSales(id));
        
        // Add message based on what happened
        String message;
        if (newBalance.compareTo(BigDecimal.ZERO) == 0 && updatedSalesCount > 0) {
            message = String.format("Payment of KES %,.2f recorded successfully! Credit balance cleared and %d pending sale(s) marked as completed.", 
                amount, updatedSalesCount);
        } else if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            message = String.format("Payment of KES %,.2f recorded successfully! Credit balance cleared.", amount);
        } else {
            message = String.format("Payment of KES %,.2f recorded successfully. Remaining balance: KES %,.2f", amount, newBalance);
        }
        
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }
    
    // NEW: Get customer credit details including pending sales
    @GetMapping("/{id}/credit-details")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomerCreditDetails(@PathVariable Long id) {
        Customer customer = customerService.getCustomerById(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("customerId", customer.getId());
        response.put("customerName", customer.getName());
        response.put("phone", customer.getPhone());
        response.put("email", customer.getEmail());
        response.put("creditBalance", customer.getCreditBalance());
        response.put("totalRefills", customer.getTotalRefills());
        response.put("totalSpent", customer.getTotalSpent());
        response.put("lastRefillDate", customer.getLastRefillDate());
        response.put("hasPendingCreditSales", saleService.hasPendingCreditSales(id));
        response.put("totalPendingAmount", saleService.getTotalPendingAmountForCustomer(id));
        
        // Optional: Include pending sales list if needed
        boolean includePendingSales = false;
        response.put("pendingSales", includePendingSales ? saleService.getPendingCreditSalesForCustomer(id) : null);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // NEW: Get all pending credit sales for a customer
    @GetMapping("/{id}/pending-sales")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<com.kaafi.aqua.dto.response.SaleResponse>>> getCustomerPendingSales(@PathVariable Long id) {
        List<com.kaafi.aqua.dto.response.SaleResponse> pendingSales = saleService.getPendingCreditSalesForCustomer(id);
        return ResponseEntity.ok(ApiResponse.success(pendingSales));
    }
    
    // NEW: Batch update pending sales to completed for a customer
    @PostMapping("/{id}/complete-pending-sales")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> completePendingSales(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        
        Customer customer = customerService.getCustomerById(id);
        
        // Check if customer has any pending sales
        if (!saleService.hasPendingCreditSales(id)) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("No pending credit sales found for this customer"));
        }
        
        // Update all pending sales to completed
        int updatedCount = saleService.updateAllPendingCreditSalesToCompleted(id, username);
        
        Map<String, Object> response = new HashMap<>();
        response.put("customerId", id);
        response.put("customerName", customer.getName());
        response.put("updatedSalesCount", updatedCount);
        
        String message = String.format("Successfully marked %d pending sale(s) as completed for customer %s", 
            updatedCount, customer.getName());
        
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    // Get all sales for a customer (both credit and cash)
@GetMapping("/{customerId}/sales")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public ResponseEntity<ApiResponse<List<com.kaafi.aqua.dto.response.SaleResponse>>> getCustomerSales(
        @PathVariable Long customerId) {
    log.info("Fetching all sales for customer ID: {}", customerId);
    List<com.kaafi.aqua.dto.response.SaleResponse> sales = saleService.getSalesByCustomerId(customerId);
    return ResponseEntity.ok(ApiResponse.success(sales));
}

// Delete a specific sale from a customer (Admin only)
@DeleteMapping("/{customerId}/sales/{saleId}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ApiResponse<Void>> deleteCustomerSale(
        @PathVariable Long customerId,
        @PathVariable Long saleId) {
    log.info("Deleting sale {} for customer {}", saleId, customerId);
    saleService.deleteSale(saleId);
    return ResponseEntity.ok(ApiResponse.success("Sale deleted successfully", null));
}
}