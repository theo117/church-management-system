package com.churchmanagement.api.dto;

import com.churchmanagement.api.domain.Role;

public class MemberResponse {

    private Long id;
    private String name;
    private String email;
    private String status;
    private String ministry;
    private String smallGroup;
    private String lastAttended;
    private Role role;
    private boolean enabled;

    public MemberResponse() {}

    public MemberResponse(
            Long id,
            String name,
            String email,
            String status,
            String ministry,
            String smallGroup,
            String lastAttended,
            Role role,
            boolean enabled) {

        this.id = id;
        this.name = name;
        this.email = email;
        this.status = status;
        this.ministry = ministry;
        this.smallGroup = smallGroup;
        this.lastAttended = lastAttended;
        this.role = role;
        this.enabled = enabled;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getStatus() { return status; }
    public String getMinistry() { return ministry; }
    public String getSmallGroup() { return smallGroup; }
    public String getLastAttended() { return lastAttended; }
    public Role getRole() { return role; }
    public boolean isEnabled() { return enabled; }
}