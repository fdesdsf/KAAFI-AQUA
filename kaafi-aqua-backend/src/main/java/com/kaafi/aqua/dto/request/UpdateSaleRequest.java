package com.kaafi.aqua.dto.request;

import com.kaafi.aqua.enums.PaymentMethod;
import com.kaafi.aqua.enums.SaleStatus;
import lombok.Data;

import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.Size;
import java.math.BigDecimal;

@Data
public class UpdateSaleRequest {
    
    @Size(max = 100, message = "Customer name cannot exceed 100 characters")
    private String customer;
    
    @DecimalMin(value = "0.0", message = "Amount must be greater than or equal to 0")
    private BigDecimal amount;
    
    private PaymentMethod method;
    
    private SaleStatus status;
    
    @DecimalMin(value = "0.0", message = "Paid amount must be greater than or equal to 0")
    private BigDecimal paidAmount;
}