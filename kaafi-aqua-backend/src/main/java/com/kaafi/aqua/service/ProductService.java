package com.kaafi.aqua.service;

import com.kaafi.aqua.model.Product;
import com.kaafi.aqua.model.ProductCategory;
import com.kaafi.aqua.repository.ProductRepository;
import com.kaafi.aqua.repository.ProductCategoryRepository;
import com.kaafi.aqua.util.ActivityLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ActivityLogger activityLogger;
    
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    public Product getProductById(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }
    
    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }
    
    public List<Product> getActiveProducts() {
        return productRepository.findByIsActive(true);
    }
    
    public List<Product> searchProducts(String keyword) {
        return productRepository.searchProducts(keyword);
    }
    
    @Transactional
    public Product createProduct(Product product) {
        // Verify category exists
        ProductCategory category = categoryRepository.findById(product.getCategoryId())
            .orElseThrow(() -> new RuntimeException("Category not found"));
        
        Product savedProduct = productRepository.save(product);
        
        activityLogger.log("system", "CREATE_PRODUCT", "Product", savedProduct.getId(), 
            "Created product: " + savedProduct.getName() + " - Price: " + savedProduct.getPrice());
        
        return savedProduct;
    }
    
    @Transactional
    public Product updateProduct(Long id, Product productData) {
        Product product = getProductById(id);
        
        product.setName(productData.getName());
        product.setCategoryId(productData.getCategoryId());
        product.setSize(productData.getSize());
        product.setUnit(productData.getUnit());
        product.setPrice(productData.getPrice());
        product.setIsActive(productData.getIsActive());
        
        Product updatedProduct = productRepository.save(product);
        
        activityLogger.log("system", "UPDATE_PRODUCT", "Product", id, 
            "Updated product: " + product.getName() + " - New price: " + product.getPrice());
        
        return updatedProduct;
    }
    
    @Transactional
    public void deleteProduct(Long id) {
        Product product = getProductById(id);
        productRepository.delete(product);
        
        activityLogger.log("system", "DELETE_PRODUCT", "Product", id, 
            "Deleted product: " + product.getName());
    }
    
    // Category CRUD methods
    public List<ProductCategory> getAllCategories() {
        return categoryRepository.findAll();
    }
    
    public ProductCategory getCategoryById(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
    }
    
    @Transactional
    public ProductCategory createCategory(ProductCategory category) {
        ProductCategory savedCategory = categoryRepository.save(category);
        
        activityLogger.log("system", "CREATE_CATEGORY", "ProductCategory", savedCategory.getId(), 
            "Created category: " + savedCategory.getName() + " - Type: " + savedCategory.getType());
        
        return savedCategory;
    }
    
    @Transactional
    public ProductCategory updateCategory(Long id, ProductCategory categoryData) {
        ProductCategory category = getCategoryById(id);
        
        category.setName(categoryData.getName());
        category.setType(categoryData.getType());
        category.setDescription(categoryData.getDescription());
        
        ProductCategory updatedCategory = categoryRepository.save(category);
        
        activityLogger.log("system", "UPDATE_CATEGORY", "ProductCategory", id, 
            "Updated category: " + category.getName());
        
        return updatedCategory;
    }
    
    @Transactional
    public void deleteCategory(Long id) {
        ProductCategory category = getCategoryById(id);
        
        // Check if category has products before deleting
        long productCount = productRepository.countByCategoryId(id);
        if (productCount > 0) {
            throw new RuntimeException("Cannot delete category with " + productCount + " products. Reassign or delete products first.");
        }
        
        categoryRepository.delete(category);
        
        activityLogger.log("system", "DELETE_CATEGORY", "ProductCategory", id, 
            "Deleted category: " + category.getName());
    }
}