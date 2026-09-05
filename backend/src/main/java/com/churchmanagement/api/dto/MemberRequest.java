package com.churchmanagement.api.dto;

import com.churchmanagement.api.domain.Role;

public record MemberRequest(
        String name,
        String email,
        String status,
        String ministry,
        String smallGroup,
        String lastAttended,
        Role role
) {}