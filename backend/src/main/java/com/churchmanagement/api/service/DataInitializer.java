package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.AttendanceService;
import com.churchmanagement.api.domain.AttendanceTrendPoint;
import com.churchmanagement.api.domain.CareAlert;
import com.churchmanagement.api.domain.ChurchEvent;
import com.churchmanagement.api.domain.Communication;
import com.churchmanagement.api.domain.Donation;
import com.churchmanagement.api.domain.Fund;
import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.domain.ReportMetric;
import com.churchmanagement.api.domain.VolunteerUpdate;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {
    private final boolean seedData;

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

    public DataInitializer(
        @Value("${app.seed-data:false}") boolean seedData,
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
        this.seedData = seedData;
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

    @Override
    public void run(String... args) {
        if (!seedData) {
            return;
        }

        if (memberRepository.count() > 0) {
            return;
        }

        memberRepository.saveAll(List.of(
            new Member("Maria Johnson", "active", "Worship", "Hope Circle", "Feb 9"),
            new Member("David Kim", "new", "Youth", "Ignite", "Feb 2"),
            new Member("Anna Garcia", "inactive", "Outreach", "Bridge", "Dec 21"),
            new Member("Samuel Reed", "active", "Men", "Iron Group", "Feb 9"),
            new Member("Grace Osei", "active", "Children", "Sunflower", "Feb 9"),
            new Member("Lucas Brown", "new", "Media", "Launch", "Jan 26")
        ));

        attendanceServiceRepository.saveAll(List.of(
            new AttendanceService("Sunday 9:00 AM", 284, 34),
            new AttendanceService("Sunday 11:00 AM", 339, 38),
            new AttendanceService("Wednesday Bible Study", 154, 18)
        ));

        attendanceTrendPointRepository.saveAll(List.of(
            new AttendanceTrendPoint(1, 62),
            new AttendanceTrendPoint(2, 70),
            new AttendanceTrendPoint(3, 68),
            new AttendanceTrendPoint(4, 74),
            new AttendanceTrendPoint(5, 73),
            new AttendanceTrendPoint(6, 77),
            new AttendanceTrendPoint(7, 84),
            new AttendanceTrendPoint(8, 81),
            new AttendanceTrendPoint(9, 79),
            new AttendanceTrendPoint(10, 88),
            new AttendanceTrendPoint(11, 86),
            new AttendanceTrendPoint(12, 91)
        ));

        churchEventRepository.saveAll(List.of(
            new ChurchEvent("Leadership Prayer Night", "Pastoral Team", 55, "Feb 14", 48, 80, true),
            new ChurchEvent("Young Adults Gathering", "Young Adults", 62, "Feb 18", 92, 120, true),
            new ChurchEvent("Community Food Drive", "Outreach", 74, "Feb 22", 130, 150, true),
            new ChurchEvent("Marriage Workshop", "Family Ministry", 58, "Mar 01", 58, 100, true),
            new ChurchEvent("Easter Production", "Creative Arts", 64, "Apr 05", 0, 0, false),
            new ChurchEvent("Kids Camp", "Children Ministry", 48, "Jun 12", 0, 0, false),
            new ChurchEvent("Missions Weekend", "Outreach", 72, "Jul 20", 0, 0, false)
        ));

        careAlertRepository.saveAll(List.of(
            new CareAlert("Hospital Visit Needed", "3 families requested pastoral visits this week."),
            new CareAlert("Bereavement Follow-up", "2 households require care team assignment."),
            new CareAlert("New Believer Mentorship", "7 new believers waiting for mentor matching.")
        ));

        donationRepository.saveAll(List.of(
            new Donation("Anonymous", "General", new BigDecimal("2500"), "Feb 9"),
            new Donation("L. Thompson", "Missions", new BigDecimal("1200"), "Feb 9"),
            new Donation("R. Patel", "Building", new BigDecimal("5000"), "Feb 8"),
            new Donation("K. Green", "Benevolence", new BigDecimal("650"), "Feb 7")
        ));

        fundRepository.saveAll(List.of(
            new Fund("General Fund", 165000L, 220000L),
            new Fund("Missions Fund", 72000L, 100000L),
            new Fund("Building Fund", 298000L, 450000L)
        ));

        volunteerUpdateRepository.saveAll(List.of(
            new VolunteerUpdate("Worship Team: 5 positions unfilled for next 2 Sundays."),
            new VolunteerUpdate("Guest Services: 93% rota coverage this month."),
            new VolunteerUpdate("Children Check-In: background check renewal due for 4 workers."),
            new VolunteerUpdate("Production Team: training day scheduled for Feb 20.")
        ));

        communicationRepository.saveAll(List.of(
            new Communication("Sunday Follow-up Email", "All First-Time Guests", "Draft"),
            new Communication("Volunteer Reminder SMS", "Weekend Teams", "Scheduled"),
            new Communication("Prayer Update Newsletter", "Prayer Chain", "Sent")
        ));

        reportMetricRepository.saveAll(List.of(
            new ReportMetric("Membership Growth", "+8.4% YoY"),
            new ReportMetric("Volunteer Retention", "87%"),
            new ReportMetric("Giving Consistency", "72% recurring donors"),
            new ReportMetric("Small Group Participation", "61% of adults")
        ));
    }
}
