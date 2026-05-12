package com.kaafi.aqua.model;

import com.kaafi.aqua.enums.PaymentMethod;
import com.kaafi.aqua.enums.SaleStatus;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales", indexes = {
    @Index(name = "idx_date", columnList = "date"),
    @Index(name = "idx_customer", columnList = "customer"),
    @Index(name = "idx_method", columnList = "method"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_customer_id", columnList = "customer_id")
})
public class Sale {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDate date;
    
    @Column(nullable = false)
    private LocalTime time;
    
    @Column(nullable = false, length = 100)
    private String customer;
    
    @Column(nullable = false, length = 10)
    private String size;
    
    @Column(nullable = false)
    private Integer quantity = 1;
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    
    // ✅ ADD DISCOUNT FIELDS HERE (after amount)
    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;
    
    @Column(name = "original_amount", precision = 10, scale = 2)
    private BigDecimal originalAmount;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method = PaymentMethod.CASH;
    
    @Enumerated(EnumType.STRING)
    private SaleStatus status = SaleStatus.COMPLETED;
    
    @Column(nullable = false, length = 100)
    private String staff;
    
    // New fields for credit payment system
    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;
    
    @Column(name = "balance", insertable = false, updatable = false)
    private BigDecimal balance;
    
    @Column(name = "customer_id")
    private Long customerId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    
    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }
    
    public String getCustomer() { return customer; }
    public void setCustomer(String customer) { this.customer = customer; }
    
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    
    // ✅ ADD GETTERS AND SETTERS FOR DISCOUNT FIELDS
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { 
        this.discountAmount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
    }
    
    public BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }
    
    public PaymentMethod getMethod() { return method; }
    public void setMethod(PaymentMethod method) { this.method = method; }
    
    public SaleStatus getStatus() { return status; }
    public void setStatus(SaleStatus status) { this.status = status; }
    
    public String getStaff() { return staff; }
    public void setStaff(String staff) { this.staff = staff; }
    
    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { 
        this.paidAmount = paidAmount;
        // If paidAmount equals amount, mark as COMPLETED
        if (paidAmount != null && amount != null && paidAmount.compareTo(amount) >= 0) {
            this.status = SaleStatus.COMPLETED;
        }
    }
    
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (date == null) {
            date = LocalDate.now();
        }
        if (time == null) {
            time = LocalTime.now();
        }
        if (quantity == null) {
            quantity = 1;
        }
        if (status == null) {
            status = SaleStatus.COMPLETED;
        }
        if (method == null) {
            method = PaymentMethod.CASH;
        }
        if (paidAmount == null) {
            paidAmount = BigDecimal.ZERO;
        }
        // ✅ Initialize discount fields
        if (discountAmount == null) {
            discountAmount = BigDecimal.ZERO;
        }
        if (originalAmount == null && amount != null) {
            originalAmount = amount;
        }
    }
    
    // Helper method to check if sale is fully paid
    public boolean isFullyPaid() {
        return paidAmount != null && amount != null && paidAmount.compareTo(amount) >= 0;
    }
    
    // Helper method to get remaining balance
    public BigDecimal getRemainingBalance() {
        if (amount == null) return BigDecimal.ZERO;
        if (paidAmount == null) return amount;
        return amount.subtract(paidAmount);
    }
    
    // ✅ Helper method to check if discount was applied
    public boolean hasDiscount() {
        return discountAmount != null && discountAmount.compareTo(BigDecimal.ZERO) > 0;
    }
}