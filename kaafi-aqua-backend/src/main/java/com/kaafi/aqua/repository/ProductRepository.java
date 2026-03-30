package com.kaafi.aqua.repository;

import com.kaafi.aqua.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    List<Product> findByCategoryId(Long categoryId);
    
    List<Product> findByIsActive(Boolean isActive);
    
    @Query("SELECT p FROM Product p WHERE p.name LIKE %:keyword% OR p.size LIKE %:keyword%")
    List<Product> searchProducts(@Param("keyword") String keyword);
    
    Optional<Product> findByNameAndSize(String name, String size);
    long countByCategoryId(Long categoryId);
}