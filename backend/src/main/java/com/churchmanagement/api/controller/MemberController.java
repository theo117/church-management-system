package com.churchmanagement.api.controller;

import com.churchmanagement.api.dto.MemberDetailsResponse;
import com.churchmanagement.api.dto.MemberRequest;
import com.churchmanagement.api.service.MemberService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

        return memberService.createMember(request);
    }
}