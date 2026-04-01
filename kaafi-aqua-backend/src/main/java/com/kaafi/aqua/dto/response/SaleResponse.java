package com.kaafi.aqua.dto.response;

import com.kaafi.aqua.enums.PaymentMethod;
import com.kaafi.aqua.enums.SaleStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class SaleResponse {
    private Long id;
    private LocalDate date;
    private LocalTime time;
    private String customer;
    private String size;
    private Integer quantity;
    private BigDecimal amount;
    private PaymentMethod method;
    private SaleStatus status;
    private String staff;
    private BigDecimal paidAmount;           // ✅ ADD THIS
    private BigDecimal remainingBalance;     // ✅ ADD THIS
    private Long customerId;
}