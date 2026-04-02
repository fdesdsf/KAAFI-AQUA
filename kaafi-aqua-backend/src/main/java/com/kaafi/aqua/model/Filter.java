package com.kaafi.aqua.model;

import com.kaafi.aqua.enums.FilterStatus;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "filters")
public class Filter {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FilterStatus status = FilterStatus.GOOD;
    
    @Column(nullable = false)
    private Integer percentage;
    
    @Column(name = "last_changed", nullable = false)
    private LocalDate lastChanged;
    
    @Column(nullable = false)
    private Integer lifespan;
    
    @Column(nullable = false, length = 50)
    private String type;
    
    @Column(length = 500)
    private String description;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public FilterStatus getStatus() { return status; }
    public void setStatus(FilterStatus status) { this.status = status; }
    
    public Integer getPercentage() { return percentage; }
    public void setPercentage(Integer percentage) { this.percentage = percentage; }
    
    public LocalDate getLastChanged() { return lastChanged; }
    public void setLastChanged(LocalDate lastChanged) { this.lastChanged = lastChanged; }
    
    public Integer getLifespan() { return lifespan; }
    public void setLifespan(Integer lifespan) { this.lifespan = lifespan; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    // Alias methods for compatibility with FilterService that uses getActive/setActive
    public Boolean getActive() { return isActive; }
    public void setActive(Boolean active) { this.isActive = active; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = FilterStatus.GOOD;
        }
        if (isActive == null) {
            isActive = true;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}