package com.churchmanagement.api.dto;

public record MemberRequest(
        String name,
        String email,
        String status,
        String ministry,
        String smallGroup,
        String lastAttended
) {}