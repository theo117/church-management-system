package com.churchmanagement.api.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.churchmanagement.api.dto.MemberDetailsResponse;
import com.churchmanagement.api.dto.MemberRequest;
import com.churchmanagement.api.service.MemberService;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public List<MemberDetailsResponse> getAllMembers() {
        return memberService.getAllMembers();
    }

    @GetMapping("/{id}")
    public MemberDetailsResponse getMember(@PathVariable Long id) {
        return memberService.getMember(id);
    }

    @PostMapping
    public MemberDetailsResponse createMember(
            @RequestBody MemberRequest request) {
                System.out.println(">>> CREATE MEMBER HIT");

        return memberService.createMember(request);
    }
    @PutMapping("/{id}")
public MemberDetailsResponse updateMember(
        @PathVariable Long id,
        @RequestBody MemberRequest request) {

            System.out.println(">>> UPDATE MEMBER HIT");

    return memberService.updateMember(id, request);
}

@DeleteMapping("/{id}")
public void deleteMember(@PathVariable Long id) {
    memberService.deleteMember(id);
}

}