package com.kaafi.aqua.service;

import com.kaafi.aqua.dto.request.SaleRequest;
import com.kaafi.aqua.dto.request.UpdateSaleRequest;
import com.kaafi.aqua.dto.response.SaleResponse;
import com.kaafi.aqua.model.Sale;
import com.kaafi.aqua.model.TankLevel;
import com.kaafi.aqua.model.Customer;
import com.kaafi.aqua.repository.SaleRepository;
import com.kaafi.aqua.repository.TankLevelRepository;
import com.kaafi.aqua.repository.CustomerRepository;
import com.kaafi.aqua.enums.PaymentMethod;
import com.kaafi.aqua.enums.SaleStatus;
import com.kaafi.aqua.util.ActivityLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {
    
    private final SaleRepository saleRepository;
    private final TankLevelRepository tankLevelRepository;
    private final CustomerRepository customerRepository;
    private final ActivityLogger activityLogger;
    
    @Transactional
    public SaleResponse createSale(SaleRequest request, String staffName) {
        // Check tank level
        TankLevel tank = tankLevelRepository.findTopByOrderByIdDesc().orElse(null);
        if (tank != null && tank.getCurrentLevel() < request.getQuantity() * getWaterPerSize(request.getSize())) {
            throw new RuntimeException("Insufficient water in tank for this sale");
        }
        
        // Create sale
        Sale sale = new Sale();
        sale.setDate(LocalDate.now(ZoneId.of("Africa/Nairobi")));
        sale.setTime(LocalTime.now(ZoneId.of("Africa/Nairobi")));
        sale.setCustomer(request.getCustomer());
        sale.setSize(request.getSize());
        sale.setQuantity(request.getQuantity());
        sale.setAmount(request.getAmount());
        sale.setMethod(request.getMethod());
        sale.setStaff(staffName);
        
        // Handle credit sales - set status to PENDING
        if (request.getMethod() == PaymentMethod.CREDIT) {
            sale.setStatus(SaleStatus.PENDING);
            sale.setPaidAmount(BigDecimal.ZERO);
        } else {
            sale.setStatus(SaleStatus.COMPLETED);
            sale.setPaidAmount(request.getAmount());
        }
        
        // Handle customer linking and credit balance update
        Customer customer = null;
        
        // Try to find existing customer by ID first
        if (request.getCustomerId() != null) {
            Optional<Customer> customerOpt = customerRepository.findById(request.getCustomerId());
            if (customerOpt.isPresent()) {
                customer = customerOpt.get();
                sale.setCustomerId(customer.getId());
            }
        }
        
        // If not found by ID, try by phone
        if (customer == null && request.getCustomerPhone() != null && !request.getCustomerPhone().isEmpty()) {
            Optional<Customer> customerOpt = customerRepository.findByPhone(request.getCustomerPhone());
            if (customerOpt.isPresent()) {
                customer = customerOpt.get();
                sale.setCustomerId(customer.getId());
            }
        }
        
        // If still not found, try by name
        if (customer == null && request.getCustomer() != null && !request.getCustomer().isEmpty()) {
            Optional<Customer> customerOpt = customerRepository.findByName(request.getCustomer());
            if (customerOpt.isPresent()) {
                customer = customerOpt.get();
                sale.setCustomerId(customer.getId());
            }
        }
        
        // Save sale first
        Sale savedSale = saleRepository.save(sale);
        
        // Update customer if found, otherwise create new customer
        if (customer != null) {
            updateCustomerStats(customer, savedSale.getAmount(), request.getMethod() == PaymentMethod.CREDIT);
        } else if (request.getCustomerPhone() != null && !request.getCustomerPhone().isEmpty()) {
            // Create new customer
            Customer newCustomer = new Customer();
            newCustomer.setName(request.getCustomer());
            newCustomer.setPhone(request.getCustomerPhone());
            newCustomer.setTotalRefills(1);
            newCustomer.setTotalSpent(savedSale.getAmount());
            newCustomer.setLastRefillDate(LocalDate.now());
            
            if (request.getMethod() == PaymentMethod.CREDIT) {
                newCustomer.setCreditBalance(savedSale.getAmount());
            } else {
                newCustomer.setCreditBalance(BigDecimal.ZERO);
            }
            
            Customer savedCustomer = customerRepository.save(newCustomer);
            savedSale.setCustomerId(savedCustomer.getId());
            saleRepository.save(savedSale);
            log.info("Created new customer: {} with phone: {}", request.getCustomer(), request.getCustomerPhone());
        } else if (request.getMethod() == PaymentMethod.CREDIT) {
            log.warn("Credit sale without phone number for customer: {}", request.getCustomer());
        }
        
        // Update tank level
        if (tank != null) {
            int waterUsed = request.getQuantity() * getWaterPerSize(request.getSize());
            tank.setCurrentLevel(tank.getCurrentLevel() - waterUsed);
            tankLevelRepository.save(tank);
        }
        
        activityLogger.log(staffName, "CREATE_SALE", "Sale", savedSale.getId(), 
            "Sale created: " + request.getQuantity() + "x " + request.getSize() + " to " + request.getCustomer() +
            " Method: " + request.getMethod() + " Amount: " + request.getAmount());
        
        return mapToSaleResponse(savedSale);
    }
    
    /**
     * Update an existing sale (Admin only)
     */
    @Transactional
    public SaleResponse updateSale(Long id, UpdateSaleRequest request) {
        log.info("Updating sale with id: {}", id);
        
        // Find existing sale
        Sale sale = saleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sale not found with id: " + id));
        
        // Update fields if they are provided in the request
        if (request.getCustomer() != null && !request.getCustomer().isEmpty()) {
            sale.setCustomer(request.getCustomer());
            log.info("Updated customer to: {}", request.getCustomer());
        }
        
        if (request.getAmount() != null) {
            sale.setAmount(request.getAmount());
            log.info("Updated amount to: {}", request.getAmount());
        }
        
        if (request.getMethod() != null) {
            sale.setMethod(request.getMethod());
            log.info("Updated payment method to: {}", request.getMethod());
        }
        
        if (request.getStatus() != null) {
            sale.setStatus(request.getStatus());
            log.info("Updated status to: {}", request.getStatus());
        }
        
        if (request.getPaidAmount() != null) {
            sale.setPaidAmount(request.getPaidAmount());
            log.info("Updated paid amount to: {}", request.getPaidAmount());
        }
        
        // Save the updated sale
        Sale updatedSale = saleRepository.save(sale);
        log.info("Sale updated successfully: {}", updatedSale.getId());
        
        return mapToSaleResponse(updatedSale);
    }
    
    /**
     * Delete a sale (Admin only)
     */
    @Transactional
    public void deleteSale(Long id) {
        log.info("Deleting sale with id: {}", id);
        
        // Find existing sale
        Sale sale = saleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sale not found with id: " + id));
        
        // If it was a pending credit sale, adjust customer credit balance
        if (sale.getMethod() == PaymentMethod.CREDIT && sale.getStatus() == SaleStatus.PENDING) {
            if (sale.getCustomerId() != null) {
                Optional<Customer> customerOpt = customerRepository.findById(sale.getCustomerId());
                if (customerOpt.isPresent()) {
                    Customer customer = customerOpt.get();
                    BigDecimal remainingAmount = sale.getAmount().subtract(sale.getPaidAmount());
                    BigDecimal newBalance = customer.getCreditBalance().subtract(remainingAmount);
                    if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                        newBalance = BigDecimal.ZERO;
                    }
                    customer.setCreditBalance(newBalance);
                    customerRepository.save(customer);
                    log.info("Adjusted customer {} credit balance to: {}", customer.getName(), newBalance);
                }
            }
        }
        
        // Delete the sale
        saleRepository.delete(sale);
        log.info("Sale deleted successfully: {}", id);
    }
    
    private void updateCustomerStats(Customer customer, BigDecimal amount, boolean isCredit) {
        customer.setTotalRefills(customer.getTotalRefills() + 1);
        customer.setTotalSpent(customer.getTotalSpent().add(amount));
        customer.setLastRefillDate(LocalDate.now());
        
        if (isCredit) {
            customer.setCreditBalance(customer.getCreditBalance().add(amount));
            log.info("Added credit of {} to customer {}. New balance: {}", 
                amount, customer.getName(), customer.getCreditBalance());
        }
        
        customerRepository.save(customer);
    }
    
    private int getWaterPerSize(String size) {
        switch (size) {
            case "5L": return 5;
            case "10L": return 10;
            case "18.9L": return 19;
            case "20L": return 20;
            default: return 10;
        }
    }
    
    @Transactional
    public SaleResponse recordCreditPayment(Long saleId, BigDecimal paymentAmount, String recordedBy) {
        Sale sale = saleRepository.findById(saleId)
            .orElseThrow(() -> new RuntimeException("Sale not found with id: " + saleId));
        
        if (sale.getMethod() != PaymentMethod.CREDIT) {
            throw new RuntimeException("This is not a credit sale");
        }
        
        BigDecimal newPaidAmount = sale.getPaidAmount().add(paymentAmount);
        sale.setPaidAmount(newPaidAmount);
        
        // If fully paid, mark as COMPLETED
        if (newPaidAmount.compareTo(sale.getAmount()) >= 0) {
            sale.setStatus(SaleStatus.COMPLETED);
            log.info("Credit sale {} fully paid. Total paid: {}", saleId, newPaidAmount);
        }
        
        Sale updatedSale = saleRepository.save(sale);
        
        // Update customer credit balance
        if (sale.getCustomerId() != null) {
            Customer customer = customerRepository.findById(sale.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            BigDecimal newCreditBalance = customer.getCreditBalance().subtract(paymentAmount);
            if (newCreditBalance.compareTo(BigDecimal.ZERO) < 0) {
                newCreditBalance = BigDecimal.ZERO;
            }
            customer.setCreditBalance(newCreditBalance);
            customerRepository.save(customer);
            log.info("Updated customer {} credit balance to: {}", customer.getName(), newCreditBalance);
        }
        
        activityLogger.log(recordedBy, "RECORD_CREDIT_PAYMENT", "Sale", saleId, 
            "Recorded payment of " + paymentAmount + " for credit sale. New paid amount: " + newPaidAmount);
        
        return mapToSaleResponse(updatedSale);
    }
    
    // NEW METHOD: Update all pending credit sales for a customer when credit balance is cleared
    @Transactional
    public int updateAllPendingCreditSalesToCompleted(Long customerId, String updatedBy) {
        log.info("Updating all pending credit sales for customer ID: {}", customerId);
        
        // Get all pending credit sales for this customer
        List<Sale> pendingCreditSales = saleRepository.findByCustomerIdAndMethodAndStatus(
            customerId, 
            PaymentMethod.CREDIT, 
            SaleStatus.PENDING
        );
        
        if (pendingCreditSales.isEmpty()) {
            log.info("No pending credit sales found for customer ID: {}", customerId);
            return 0;
        }
        
        int updatedCount = 0;
        
        // Update each sale to COMPLETED
        for (Sale sale : pendingCreditSales) {
            // Mark as completed
            sale.setStatus(SaleStatus.COMPLETED);
            
            // If paidAmount is still less than amount, set it to the full amount
            if (sale.getPaidAmount().compareTo(sale.getAmount()) < 0) {
                sale.setPaidAmount(sale.getAmount());
                log.info("Setting paid amount for sale {} from {} to {}", 
                    sale.getId(), sale.getPaidAmount(), sale.getAmount());
            }
            
            saleRepository.save(sale);
            updatedCount++;
            
            activityLogger.log(updatedBy, "UPDATE_SALE_STATUS", "Sale", sale.getId(), 
                "Credit sale marked as COMPLETED due to full credit balance payment");
        }
        
        log.info("Updated {} pending credit sales to COMPLETED for customer ID: {}", updatedCount, customerId);
        return updatedCount;
    }
    
    // NEW METHOD: Update all pending credit sales for a customer using batch update (more efficient)
    @Transactional
    public int batchUpdatePendingCreditSalesToCompleted(Long customerId, String updatedBy) {
        log.info("Batch updating all pending credit sales for customer ID: {}", customerId);
        
        int updatedCount = saleRepository.updatePendingCreditSalesToCompleted(
            customerId,
            SaleStatus.PENDING,
            SaleStatus.COMPLETED,
            PaymentMethod.CREDIT
        );
        
        if (updatedCount > 0) {
            activityLogger.log(updatedBy, "BATCH_UPDATE_SALES", "Customer", customerId, 
                "Batch updated " + updatedCount + " pending credit sales to COMPLETED");
        }
        
        log.info("Batch updated {} pending credit sales for customer ID: {}", updatedCount, customerId);
        return updatedCount;
    }
    
    // NEW METHOD: Check if customer has pending credit sales
    public boolean hasPendingCreditSales(Long customerId) {
        return saleRepository.existsByCustomerIdAndStatusAndMethod(
            customerId, 
            SaleStatus.PENDING, 
            PaymentMethod.CREDIT
        );
    }
    
    // NEW METHOD: Get total pending amount for a customer's credit sales
    public BigDecimal getTotalPendingAmountForCustomer(Long customerId) {
        return saleRepository.getTotalPendingAmountForCustomer(
            customerId, 
            SaleStatus.PENDING, 
            PaymentMethod.CREDIT
        );
    }
    
    // NEW METHOD: Get all pending credit sales for a customer
    public List<SaleResponse> getPendingCreditSalesForCustomer(Long customerId) {
        List<Sale> pendingSales = saleRepository.findByCustomerIdAndMethodAndStatus(
            customerId,
            PaymentMethod.CREDIT,
            SaleStatus.PENDING
        );
        
        return pendingSales.stream()
            .map(this::mapToSaleResponse)
            .collect(Collectors.toList());
    }
    
    public List<SaleResponse> getCreditSales() {
        try {
            List<Sale> creditSales = saleRepository.findByMethod(PaymentMethod.CREDIT);
            return creditSales.stream()
                .map(this::mapToSaleResponse)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching credit sales", e);
            return new ArrayList<>();
        }
    }
    
    public List<SaleResponse> getPendingCreditSales() {
        try {
            List<Sale> pendingCreditSales = saleRepository.findByMethodAndStatus(PaymentMethod.CREDIT, SaleStatus.PENDING);
            return pendingCreditSales.stream()
                .map(this::mapToSaleResponse)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching pending credit sales", e);
            return new ArrayList<>();
        }
    }
    
    public List<SaleResponse> getTodaySales() {
        try {
            List<Sale> sales = saleRepository.findByDate(LocalDate.now());
            if (sales == null || sales.isEmpty()) {
                return new ArrayList<>();
            }
            return sales.stream()
                .map(this::mapToSaleResponse)
                .filter(response -> response != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching today's sales", e);
            return new ArrayList<>();
        }
    }
    
    public List<SaleResponse> getSalesByDate(LocalDate date) {
        try {
            List<Sale> sales = saleRepository.findByDate(date);
            if (sales == null || sales.isEmpty()) {
                return new ArrayList<>();
            }
            return sales.stream()
                .map(this::mapToSaleResponse)
                .filter(response -> response != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching sales by date: {}", date, e);
            return new ArrayList<>();
        }
    }
    
    public List<SaleResponse> getSalesBetweenDates(LocalDate startDate, LocalDate endDate) {
        try {
            List<Sale> sales = saleRepository.findByDateBetween(startDate, endDate);
            if (sales == null || sales.isEmpty()) {
                return new ArrayList<>();
            }
            return sales.stream()
                .map(this::mapToSaleResponse)
                .filter(response -> response != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching sales between dates: {} and {}", startDate, endDate, e);
            return new ArrayList<>();
        }
    }
    
    public Page<SaleResponse> getSalesBetweenDatesPaginated(LocalDate startDate, LocalDate endDate, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Sale> salePage = saleRepository.findByDateBetween(startDate, endDate, pageable);
            if (salePage == null || salePage.isEmpty()) {
                return new PageImpl<>(new ArrayList<>(), pageable, 0);
            }
            return salePage.map(this::mapToSaleResponse);
        } catch (Exception e) {
            log.error("Error fetching paginated sales", e);
            return new PageImpl<>(new ArrayList<>(), PageRequest.of(page, size), 0);
        }
    }
    
    public List<SaleResponse> getSalesByStaff(String staff) {
        try {
            List<Sale> sales = saleRepository.findByStaff(staff);
            if (sales == null || sales.isEmpty()) {
                return new ArrayList<>();
            }
            return sales.stream()
                .map(this::mapToSaleResponse)
                .filter(response -> response != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching sales by staff: {}", staff, e);
            return new ArrayList<>();
        }
    }
    
    public BigDecimal getTodayRevenue() {
        try {
            BigDecimal revenue = saleRepository.getTotalRevenueByDate(LocalDate.now());
            return revenue != null ? revenue : BigDecimal.ZERO;
        } catch (Exception e) {
            log.error("Error fetching today's revenue", e);
            return BigDecimal.ZERO;
        }
    }
    
    public Long getTodaySalesCount() {
        try {
            Long count = saleRepository.getTotalSalesCountByDate(LocalDate.now());
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.error("Error fetching today's sales count", e);
            return 0L;
        }
    }
    
    public List<Object[]> getSalesBySizeBetweenDates(LocalDate startDate, LocalDate endDate) {
        try {
            List<Object[]> results = saleRepository.getSalesBySizeBetweenDates(startDate, endDate);
            return results != null ? results : new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching sales by size", e);
            return new ArrayList<>();
        }
    }
    
    private SaleResponse mapToSaleResponse(Sale sale) {
        if (sale == null) {
            return null;
        }
        
        try {
            SaleResponse response = new SaleResponse();
            response.setId(sale.getId());
            response.setDate(sale.getDate());
            response.setTime(sale.getTime());
            response.setCustomer(sale.getCustomer());
            response.setSize(sale.getSize());
            response.setQuantity(sale.getQuantity());
            response.setAmount(sale.getAmount());
            response.setMethod(sale.getMethod());
            response.setStatus(sale.getStatus());
            response.setStaff(sale.getStaff());
            response.setPaidAmount(sale.getPaidAmount());           // ✅ ADDED
            response.setRemainingBalance(sale.getRemainingBalance()); // ✅ ADDED
            response.setCustomerId(sale.getCustomerId());           // ✅ ADDED
            return response;
        } catch (Exception e) {
            log.error("Error mapping sale to response for sale id: {}", sale.getId(), e);
            return null;
        }
    }
}