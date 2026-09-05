package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.AttendanceTrendPoint;
import com.churchmanagement.api.domain.ChurchEvent;
import com.churchmanagement.api.domain.Donation;
import com.churchmanagement.api.domain.Member;
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
import com.churchmanagement.api.dto.MemberResponse;
import com.churchmanagement.api.dto.MemberUpsertRequest;
import com.churchmanagement.api.dto.ReportResponse;
import com.churchmanagement.api.dto.UpcomingEventResponse;
import com.churchmanagement.api.dto.VolunteerResponse;
import com.churchmanagement.api.dto.VolunteerUpsertRequest;
import com.churchmanagement.api.repository.AttendanceServiceRepository;
import com.churchmanagement.api.repository.AttendanceTrendPointRepository;
import com.churchmanagement.api.repository.CareAlertRepository;
import com.churchmanagement.api.repository.ChurchEventRepository;
import com.churchmanagement.api.repository.CommunicationRepository;
import com.churchmanagement.api.repository.DonationRepository;
import com.churchmanagement.api.repository.FundRepository;
import com.churchmanagement.api.repository.MemberRepository;
import com.churchmanagement.api.repository.ReportMetricRepository;
import com.churchmanagement.api.repository.VolunteerUpdateRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
public class DashboardService {

    private final MemberRepository memberRepository;
    private final AttendanceServiceRepository attendanceServiceRepository;
    private final AttendanceTrendPointRepository attendanceTrendPointRepository;
    private final ChurchEventRepository churchEventRepository;
    private final CareAlertRepository careAlertRepository;
    private final DonationRepository donationRepository;
    private final FundRepository fundRepository;
    private final VolunteerUpdateRepository volunteerUpdateRepository;
    private final CommunicationRepository communicationRepository;
    private final ReportMetricRepository reportMetricRepository;

    public DashboardService(
        MemberRepository memberRepository,
        AttendanceServiceRepository attendanceServiceRepository,
        AttendanceTrendPointRepository attendanceTrendPointRepository,
        ChurchEventRepository churchEventRepository,
        CareAlertRepository careAlertRepository,
        DonationRepository donationRepository,
        FundRepository fundRepository,
        VolunteerUpdateRepository volunteerUpdateRepository,
        CommunicationRepository communicationRepository,
        ReportMetricRepository reportMetricRepository
    ) {
        this.memberRepository = memberRepository;
        this.attendanceServiceRepository = attendanceServiceRepository;
        this.attendanceTrendPointRepository = attendanceTrendPointRepository;
        this.churchEventRepository = churchEventRepository;
        this.careAlertRepository = careAlertRepository;
        this.donationRepository = donationRepository;
        this.fundRepository = fundRepository;
        this.volunteerUpdateRepository = volunteerUpdateRepository;
        this.communicationRepository = communicationRepository;
        this.reportMetricRepository = reportMetricRepository;
    }

    public List<KpiResponse> kpis() {
        long activeMembers = memberRepository.countByStatusIgnoreCase("active");
        List<AttendanceTrendPoint> trend = attendanceTrendPointRepository.findAllByOrderByWeekOrderAsc();
        int averageAttendance = trend.isEmpty() ? 0 : (int) Math.round(trend.stream().mapToInt(AttendanceTrendPoint::getValue).average().orElse(0));
        BigDecimal monthlyGiving = donationRepository.findAll().stream().map(Donation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        int activeVolunteers = attendanceServiceRepository.findAll().stream().mapToInt(a -> a.getVolunteers() == null ? 0 : a.getVolunteers()).sum();

        return List.of(
            new KpiResponse("Active Members", formatInteger(activeMembers)),
            new KpiResponse("Avg Weekly Attendance", formatInteger(averageAttendance)),
            new KpiResponse("Monthly Giving", formatCurrency(monthlyGiving)),
            new KpiResponse("Active Volunteers", formatInteger(activeVolunteers))
        );
    }

    public List<Integer> attendanceTrend() {
        return attendanceTrendPointRepository.findAllByOrderByWeekOrderAsc().stream().map(AttendanceTrendPoint::getValue).toList();
    }

    public List<UpcomingEventResponse> upcomingEvents() {
        return churchEventRepository.findByUpcomingTrue().stream()
            .map(event -> new UpcomingEventResponse(event.getName(), event.getEventDate(), event.getSeatsTaken() + "/" + event.getSeatsTotal()))
            .toList();
    }

    public List<CareAlertResponse> careAlerts() {
        return careAlertRepository.findAll().stream()
            .map(item -> new CareAlertResponse(item.getTitle(), item.getDetails()))
            .toList();
    }

   

    public List<AttendanceServiceResponse> attendanceServices() {
        return attendanceServiceRepository.findAll().stream()
            .map(item -> new AttendanceServiceResponse(item.getServiceName(), item.getCheckedIn(), item.getVolunteers()))
            .toList();
    }

    public List<EventResponse> events() {
        return churchEventRepository.findAll().stream().map(this::toEventResponse).toList();
    }

    public EventResponse createEvent(EventUpsertRequest request) {
        ChurchEvent event = new ChurchEvent(
            safe(request.name()),
            safe(request.owner()),
            defaultInt(request.progress()),
            safe(request.eventDate()),
            defaultInt(request.seatsTaken()),
            defaultInt(request.seatsTotal()),
            request.upcoming() != null ? request.upcoming() : Boolean.FALSE
        );
        return toEventResponse(churchEventRepository.save(event));
    }

    public EventResponse updateEvent(Long id, EventUpsertRequest request) {
        ChurchEvent event = churchEventRepository.findById(id).orElseThrow();
        event.setName(safe(request.name()));
        event.setOwner(safe(request.owner()));
        event.setProgress(defaultInt(request.progress()));
        event.setEventDate(safe(request.eventDate()));
        event.setSeatsTaken(defaultInt(request.seatsTaken()));
        event.setSeatsTotal(defaultInt(request.seatsTotal()));
        event.setUpcoming(request.upcoming() != null ? request.upcoming() : Boolean.FALSE);
        return toEventResponse(churchEventRepository.save(event));
    }

    public void deleteEvent(Long id) {
        churchEventRepository.deleteById(id);
    }

    public List<DonationResponse> donations() {
        return donationRepository.findAll().stream().map(this::toDonationResponse).toList();
    }

    public DonationResponse createDonation(DonationUpsertRequest request) {
        Donation donation = new Donation(
            safe(request.donor()),
            safe(request.fund()),
            request.amount() == null ? BigDecimal.ZERO : request.amount(),
            safe(request.date())
        );
        return toDonationResponse(donationRepository.save(donation));
    }

    public DonationResponse updateDonation(Long id, DonationUpsertRequest request) {
        Donation donation = donationRepository.findById(id).orElseThrow();
        donation.setDonor(safe(request.donor()));
        donation.setFund(safe(request.fund()));
        donation.setAmount(request.amount() == null ? BigDecimal.ZERO : request.amount());
        donation.setDonationDate(safe(request.date()));
        return toDonationResponse(donationRepository.save(donation));
    }

    public void deleteDonation(Long id) {
        donationRepository.deleteById(id);
    }

    public List<FundResponse> funds() {
        return fundRepository.findAll().stream()
            .map(fund -> new FundResponse(fund.getName(), fund.getRaised(), fund.getGoal()))
            .toList();
    }

    public List<VolunteerResponse> volunteers() {
        return volunteerUpdateRepository.findAll().stream()
            .map(item -> new VolunteerResponse(item.getId(), item.getMessage()))
            .toList();
    }

    public VolunteerResponse createVolunteer(VolunteerUpsertRequest request) {
        var entity = volunteerUpdateRepository.save(new com.churchmanagement.api.domain.VolunteerUpdate(safe(request.message())));
        return new VolunteerResponse(entity.getId(), entity.getMessage());
    }

    public VolunteerResponse updateVolunteer(Long id, VolunteerUpsertRequest request) {
        var entity = volunteerUpdateRepository.findById(id).orElseThrow();
        entity.setMessage(safe(request.message()));
        entity = volunteerUpdateRepository.save(entity);
        return new VolunteerResponse(entity.getId(), entity.getMessage());
    }

    public void deleteVolunteer(Long id) {
        volunteerUpdateRepository.deleteById(id);
    }

    public List<CommunicationResponse> communications() {
        return communicationRepository.findAll().stream()
            .map(item -> new CommunicationResponse(item.getId(), item.getChannel(), item.getAudience(), item.getStatus()))
            .toList();
    }

    public CommunicationResponse createCommunication(CommunicationUpsertRequest request) {
        var entity = communicationRepository.save(
            new com.churchmanagement.api.domain.Communication(
                safe(request.channel()),
                safe(request.audience()),
                safe(request.status())
            )
        );
        return new CommunicationResponse(entity.getId(), entity.getChannel(), entity.getAudience(), entity.getStatus());
    }

    public CommunicationResponse updateCommunication(Long id, CommunicationUpsertRequest request) {
        var entity = communicationRepository.findById(id).orElseThrow();
        entity.setChannel(safe(request.channel()));
        entity.setAudience(safe(request.audience()));
        entity.setStatus(safe(request.status()));
        entity = communicationRepository.save(entity);
        return new CommunicationResponse(entity.getId(), entity.getChannel(), entity.getAudience(), entity.getStatus());
    }

    public void deleteCommunication(Long id) {
        communicationRepository.deleteById(id);
    }

    public List<ReportResponse> reports() {
        return reportMetricRepository.findAll().stream()
            .map(item -> new ReportResponse(item.getTitle(), item.getValue()))
            .toList();
    }

    private MemberResponse toMemberResponse(Member member) {
        return new MemberResponse(member.getId(), member.getName(), member.getStatus(), member.getMinistry(), member.getSmallGroup(), member.getLastAttended());
    }

    private EventResponse toEventResponse(ChurchEvent event) {
        return new EventResponse(
            event.getId(),
            event.getName(),
            event.getOwner(),
            event.getProgress(),
            event.getEventDate(),
            event.getSeatsTaken(),
            event.getSeatsTotal(),
            event.getUpcoming()
        );
    }

    private DonationResponse toDonationResponse(Donation donation) {
        return new DonationResponse(donation.getId(), donation.getDonor(), donation.getFund(), formatCurrency(donation.getAmount()), donation.getDonationDate());
    }

    private String formatInteger(long value) {
        return NumberFormat.getIntegerInstance(Locale.US).format(value);
    }

    private String formatCurrency(BigDecimal amount) {
        BigDecimal safe = amount == null ? BigDecimal.ZERO : amount;
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.US);
        return "R" + format.format(safe.setScale(0, RoundingMode.HALF_UP));
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private Integer defaultInt(Integer value) {
        return value == null ? 0 : value;
    }
}
