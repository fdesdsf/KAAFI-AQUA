package com.kaafi.aqua.repository;

import com.kaafi.aqua.model.Sale;
import com.kaafi.aqua.enums.PaymentMethod;
import com.kaafi.aqua.enums.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    
    List<Sale> findByDate(LocalDate date);
    
    List<Sale> findByDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Sale> findByStaff(String staff);
    
    List<Sale> findByCustomerContaining(String customer);
    
    List<Sale> findByMethod(PaymentMethod method);
    
    // New method to find credit sales by status
    List<Sale> findByMethodAndStatus(PaymentMethod method, SaleStatus status);
    
    // Find sales by customer ID and status
    List<Sale> findByCustomerIdAndStatus(Long customerId, SaleStatus status);
    
    // Find credit sales by customer ID and status
    List<Sale> findByCustomerIdAndMethodAndStatus(Long customerId, PaymentMethod method, SaleStatus status);
    // Find all sales by customer ID
    List<Sale> findByCustomerId(Long customerId);
    
    Page<Sale> findByDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);
    
    @Query("SELECT SUM(s.amount) FROM Sale s WHERE s.date = :date")
    BigDecimal getTotalRevenueByDate(@Param("date") LocalDate date);
    
    @Query("SELECT SUM(s.amount) FROM Sale s WHERE s.date BETWEEN :startDate AND :endDate")
    BigDecimal getTotalRevenueBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.date = :date")
    Long getTotalSalesCountByDate(@Param("date") LocalDate date);
    
    @Query("SELECT s.size, SUM(s.quantity) as total FROM Sale s WHERE s.date BETWEEN :startDate AND :endDate GROUP BY s.size")
    List<Object[]> getSalesBySizeBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT s.method, SUM(s.amount) FROM Sale s WHERE s.date BETWEEN :startDate AND :endDate GROUP BY s.method")
    List<Object[]> getRevenueByPaymentMethod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT s.staff, COUNT(s), SUM(s.amount) FROM Sale s WHERE s.date BETWEEN :startDate AND :endDate GROUP BY s.staff")
    List<Object[]> getStaffPerformance(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // NEW METHODS FOR CREDIT PAYMENT SYSTEM
    
    /**
     * Update all pending credit sales for a customer to completed status
     */
    @Modifying
    @Transactional
    @Query("UPDATE Sale s SET s.status = :newStatus WHERE s.customerId = :customerId AND s.status = :oldStatus AND s.method = :paymentMethod")
    int updatePendingCreditSalesToCompleted(
        @Param("customerId") Long customerId,
        @Param("oldStatus") SaleStatus oldStatus,
        @Param("newStatus") SaleStatus newStatus,
        @Param("paymentMethod") PaymentMethod paymentMethod
    );
    
    /**
     * Check if customer has pending credit sales
     */
    boolean existsByCustomerIdAndStatusAndMethod(Long customerId, SaleStatus status, PaymentMethod method);
    
    /**
     * Get total pending amount for a customer (credit sales)
     */
    @Query("SELECT COALESCE(SUM(s.amount - COALESCE(s.paidAmount, 0)), 0) FROM Sale s WHERE s.customerId = :customerId AND s.status = :status AND s.method = :method")
    BigDecimal getTotalPendingAmountForCustomer(
        @Param("customerId") Long customerId,
        @Param("status") SaleStatus status,
        @Param("method") PaymentMethod method
    );
    
    /**
     * Update payment for a specific sale
     */
    @Modifying
    @Transactional
    @Query("UPDATE Sale s SET s.paidAmount = :paidAmount, s.status = CASE WHEN :paidAmount >= s.amount THEN 'COMPLETED' ELSE s.status END WHERE s.id = :saleId")
    int updateSalePayment(@Param("saleId") Long saleId, @Param("paidAmount") BigDecimal paidAmount);
}