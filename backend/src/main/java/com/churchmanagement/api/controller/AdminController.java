package com.churchmanagement.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.churchmanagement.api.dto.MemberDetailsResponse;
import com.churchmanagement.api.dto.RoleChangeRequest;
import com.churchmanagement.api.service.MemberService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final MemberService memberService;

    public AdminController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public String admin() {
        return "Welcome Admin!";
    }

    @PutMapping("/members/{id}/role")
    public MemberDetailsResponse changeMemberRole(
            @PathVariable Long id,
            @RequestBody RoleChangeRequest request) {
        if (request == null || request.role() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        return memberService.changeRole(id, request.role());
    }
}