package com.churchmanagement.api.dto;

import com.churchmanagement.api.domain.Role;

public class MemberRequest {

    private String name;
    private String email;
    private String status;
    private String ministry;
    private String smallGroup;
    private String lastAttended;
    private Role role;

    public MemberRequest() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMinistry() {
        return ministry;
    }

    public void setMinistry(String ministry) {
        this.ministry = ministry;
    }

    public String getSmallGroup() {
        return smallGroup;
    }

    public void setSmallGroup(String smallGroup) {
        this.smallGroup = smallGroup;
    }

    public String getLastAttended() {
        return lastAttended;
    }

    public void setLastAttended(String lastAttended) {
        this.lastAttended = lastAttended;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}