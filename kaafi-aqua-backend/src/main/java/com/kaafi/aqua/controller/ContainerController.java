package com.kaafi.aqua.controller;

import com.kaafi.aqua.dto.response.ApiResponse;
import com.kaafi.aqua.model.ContainerType;
import com.kaafi.aqua.service.ContainerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class ContainerController {
    
    private final ContainerService containerService;
    
    @GetMapping("/containers")
     @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<ContainerType>>> getAllContainers() {
        List<ContainerType> containers = containerService.getAllContainers();
        return ResponseEntity.ok(ApiResponse.success(containers));
    }
    
    @GetMapping("/containers/{id}")
     @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')") 
    public ResponseEntity<ApiResponse<ContainerType>> getContainerById(@PathVariable Long id) {
        ContainerType container = containerService.getContainerById(id);
        return ResponseEntity.ok(ApiResponse.success(container));
    }
    
    @GetMapping("/containers/active")
     @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<List<ContainerType>>> getActiveContainers() {
        List<ContainerType> containers = containerService.getActiveContainers();
        return ResponseEntity.ok(ApiResponse.success(containers));
    }
    
    @GetMapping("/containers/type/{type}")
     @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')") 
    public ResponseEntity<ApiResponse<List<ContainerType>>> getContainersByType(@PathVariable String type) {
        List<ContainerType> containers = containerService.getContainersByType(type);
        return ResponseEntity.ok(ApiResponse.success(containers));
    }
    
    @GetMapping("/containers/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')") 
    public ResponseEntity<ApiResponse<List<ContainerType>>> searchContainers(@RequestParam String keyword) {
        List<ContainerType> containers = containerService.searchContainers(keyword);
        return ResponseEntity.ok(ApiResponse.success(containers));
    }
    
    @PostMapping("/containers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ContainerType>> createContainer(@Valid @RequestBody ContainerType container) {
        ContainerType createdContainer = containerService.createContainer(container);
        return ResponseEntity.ok(ApiResponse.success("Container created successfully", createdContainer));
    }
    
    @PutMapping("/containers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ContainerType>> updateContainer(
            @PathVariable Long id, 
            @Valid @RequestBody ContainerType container) {
        ContainerType updatedContainer = containerService.updateContainer(id, container);
        return ResponseEntity.ok(ApiResponse.success("Container updated successfully", updatedContainer));
    }
    
    @DeleteMapping("/containers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteContainer(@PathVariable Long id) {
        containerService.deleteContainer(id);
        return ResponseEntity.ok(ApiResponse.success("Container deleted successfully", null));
    }
    
    @PatchMapping("/containers/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ContainerType>> toggleContainerStatus(@PathVariable Long id) {
        ContainerType updatedContainer = containerService.toggleContainerStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Container status updated successfully", updatedContainer));
    }
}