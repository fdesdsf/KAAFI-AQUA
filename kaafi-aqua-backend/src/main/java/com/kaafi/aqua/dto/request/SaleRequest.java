package com.kaafi.aqua.dto.request;

import com.kaafi.aqua.enums.PaymentMethod;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaleRequest {
    @NotBlank(message = "Customer name is required")
    private String customer;
    
    @NotBlank(message = "Size is required")
    private String size;
    
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
    
    @NotNull(message = "Amount is required")
    @Min(value = 0, message = "Amount must be positive")
    private BigDecimal amount;
    
    private PaymentMethod method = PaymentMethod.CASH;
    
    // New fields for customer tracking and credit sales
    private String customerPhone;
    private Long customerId;

     // ✅ ADD DISCOUNT FIELDS HERE
    private BigDecimal discountAmount = BigDecimal.ZERO;  // Discount amount in KES
    private BigDecimal originalAmount;                    // Original price before discount
}