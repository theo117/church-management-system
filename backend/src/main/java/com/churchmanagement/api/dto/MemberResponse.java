package com.churchmanagement.api.dto;

public record MemberResponse(
        Long id,
        String name,
        String status,
        String ministry,
        String smallGroup,
        String lastAttended
) {}