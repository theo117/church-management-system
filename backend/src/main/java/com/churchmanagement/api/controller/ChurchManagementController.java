package com.churchmanagement.api.controller;

import com.churchmanagement.api.dto.AttendanceServiceResponse;
import com.churchmanagement.api.dto.CareAlertResponse;
import com.churchmanagement.api.dto.CommunicationResponse;
import com.churchmanagement.api.dto.CommunicationUpsertRequest;
import com.churchmanagement.api.dto.DonationResponse;
import com.churchmanagement.api.dto.DonationUpsertRequest;
import com.churchmanagement.api.dto.EventResponse;
import com.churchmanagement.api.dto.EventUpsertRequest;
import com.churchmanagement.api.dto.FundResponse;
import com.churchmanagement.api.dto.KpiResponse;

import com.churchmanagement.api.dto.ReportResponse;
import com.churchmanagement.api.dto.UpcomingEventResponse;
import com.churchmanagement.api.dto.VolunteerResponse;
import com.churchmanagement.api.dto.VolunteerUpsertRequest;
import com.churchmanagement.api.service.DashboardService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChurchManagementController {

    private final DashboardService dashboardService;

    public ChurchManagementController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard/kpis")
    public List<KpiResponse> getKpis() {
        return dashboardService.kpis();
    }

    @GetMapping("/dashboard/attendance-trend")
    public List<Integer> getAttendanceTrend() {
        return dashboardService.attendanceTrend();
    }

    @GetMapping("/events/upcoming")
    public List<UpcomingEventResponse> getUpcomingEvents() {
        return dashboardService.upcomingEvents();
    }

    @GetMapping("/care/alerts")
    public List<CareAlertResponse> getCareAlerts() {
        return dashboardService.careAlerts();
    }

    

    @GetMapping("/attendance/services")
    public List<AttendanceServiceResponse> getAttendanceServices() {
        return dashboardService.attendanceServices();
    }

    @GetMapping("/events")
    public List<EventResponse> getEvents() {
        return dashboardService.events();
    }

    @PostMapping("/events")
    public EventResponse createEvent(@RequestBody EventUpsertRequest request) {
        return dashboardService.createEvent(request);
    }

    @PutMapping("/events/{id}")
    public EventResponse updateEvent(@PathVariable Long id, @RequestBody EventUpsertRequest request) {
        return dashboardService.updateEvent(id, request);
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(@PathVariable Long id) {
        dashboardService.deleteEvent(id);
    }

    @GetMapping("/donations")
    public List<DonationResponse> getDonations() {
        return dashboardService.donations();
    }

    @PostMapping("/donations")
    public DonationResponse createDonation(@RequestBody DonationUpsertRequest request) {
        return dashboardService.createDonation(request);
    }

    @PutMapping("/donations/{id}")
    public DonationResponse updateDonation(@PathVariable Long id, @RequestBody DonationUpsertRequest request) {
        return dashboardService.updateDonation(id, request);
    }

    @DeleteMapping("/donations/{id}")
    public void deleteDonation(@PathVariable Long id) {
        dashboardService.deleteDonation(id);
    }

    @GetMapping("/funds")
    public List<FundResponse> getFunds() {
        return dashboardService.funds();
    }

    @GetMapping("/volunteers")
    public List<VolunteerResponse> getVolunteers() {
        return dashboardService.volunteers();
    }

    @PostMapping("/volunteers")
    public VolunteerResponse createVolunteer(@RequestBody VolunteerUpsertRequest request) {
        return dashboardService.createVolunteer(request);
    }

    @PutMapping("/volunteers/{id}")
    public VolunteerResponse updateVolunteer(@PathVariable Long id, @RequestBody VolunteerUpsertRequest request) {
        return dashboardService.updateVolunteer(id, request);
    }

    @DeleteMapping("/volunteers/{id}")
    public void deleteVolunteer(@PathVariable Long id) {
        dashboardService.deleteVolunteer(id);
    }

    @GetMapping("/communications")
    public List<CommunicationResponse> getCommunications() {
        return dashboardService.communications();
    }

    @PostMapping("/communications")
    public CommunicationResponse createCommunication(@RequestBody CommunicationUpsertRequest request) {
        return dashboardService.createCommunication(request);
    }

    @PutMapping("/communications/{id}")
    public CommunicationResponse updateCommunication(@PathVariable Long id, @RequestBody CommunicationUpsertRequest request) {
        return dashboardService.updateCommunication(id, request);
    }

    @DeleteMapping("/communications/{id}")
    public void deleteCommunication(@PathVariable Long id) {
        dashboardService.deleteCommunication(id);
    }

    @GetMapping("/reports")
    public List<ReportResponse> getReports() {
        return dashboardService.reports();
    }
}
