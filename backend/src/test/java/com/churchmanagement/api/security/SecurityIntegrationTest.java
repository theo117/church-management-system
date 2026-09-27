package com.churchmanagement.api.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.domain.Role;
import com.churchmanagement.api.repository.MemberRepository;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@SpringBootTest(
        properties = {
                "spring.datasource.url=jdbc:h2:mem:security-audit;DB_CLOSE_DELAY=-1",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.flyway.enabled=false",
                "app.seed-data=false",
                "JWT_SECRET=integration-test-runtime-key-2a5d90b327f84211"
        })
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SecurityIntegrationTest {
    private static final String PASSWORD = "integration-test-password";
    private static final String JWT_SECRET = "integration-test-runtime-key-2a5d90b327f84211";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private Member member;
    private Member administrator;
    private Member treasurer;

    @BeforeEach
    void createUsers() {
        String testId = UUID.randomUUID().toString();
        member = saveMember("member-" + testId + "@example.test", Role.MEMBER);
        administrator = saveMember("admin-" + testId + "@example.test", Role.ADMIN);
        treasurer = saveMember("treasurer-" + testId + "@example.test", Role.TREASURER);
    }

    @Test
    void memberCanReadResourcesButCannotMutateManagementResources() throws Exception {
        String token = tokenFor(member);
        String[][] resources = {
                {"/api/members", "{\"name\":\"New Member\",\"email\":\"new@example.test\",\"status\":\"active\"}"},
                {"/api/events", "{\"name\":\"Event\",\"owner\":\"Team\",\"progress\":1,\"eventDate\":\"Jun 1\",\"seatsTaken\":0,\"seatsTotal\":10,\"upcoming\":true}"},
                {"/api/donations", "{\"donor\":\"Donor\",\"fund\":\"General\",\"amount\":10,\"date\":\"Jun 1\"}"},
                {"/api/volunteers", "{\"message\":\"Request\"}"},
                {"/api/communications", "{\"channel\":\"Email\",\"audience\":\"All\",\"status\":\"Draft\"}"}
        };

        for (String[] resource : resources) {
            mockMvc.perform(get(resource[0]).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
            mockMvc.perform(apiRequest(HttpMethod.POST, resource[0], token, resource[1]))
                    .andExpect(status().isForbidden());
            mockMvc.perform(apiRequest(HttpMethod.PUT, resource[0] + "/1", token, resource[1]))
                    .andExpect(status().isForbidden());
            mockMvc.perform(apiRequest(HttpMethod.DELETE, resource[0] + "/1", token, null))
                    .andExpect(status().isForbidden());
        }

        mockMvc.perform(get("/api/funds").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorCanCreateUpdateAndDeleteAllManagedResources() throws Exception {
        String token = tokenFor(administrator);
        String[][] resources = {
                {"/api/members", "{\"name\":\"Managed Member\",\"email\":\"managed-" + UUID.randomUUID() + "@example.test\",\"status\":\"active\",\"ministry\":\"Choir\",\"smallGroup\":\"North\",\"lastAttended\":\"Jun 1\"}"},
                {"/api/events", "{\"name\":\"Event\",\"owner\":\"Team\",\"progress\":1,\"eventDate\":\"Jun 1\",\"seatsTaken\":0,\"seatsTotal\":10,\"upcoming\":true}"},
                {"/api/donations", "{\"donor\":\"Donor\",\"fund\":\"General\",\"amount\":10,\"date\":\"Jun 1\"}"},
                {"/api/volunteers", "{\"message\":\"Request\"}"},
                {"/api/communications", "{\"channel\":\"Email\",\"audience\":\"All\",\"status\":\"Draft\"}"}
        };

        for (String[] resource : resources) {
            mockMvc.perform(get(resource[0]).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
            String created = mockMvc.perform(apiRequest(HttpMethod.POST, resource[0], token, resource[1]))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            Number idNumber = com.jayway.jsonpath.JsonPath.read(created, "$.id");
            long id = idNumber.longValue();
            if (resource[0].equals("/api/members")) {
                mockMvc.perform(get(resource[0] + "/" + id)
                                .header("Authorization", "Bearer " + token))
                        .andExpect(status().isOk());
            }
            mockMvc.perform(apiRequest(HttpMethod.PUT, resource[0] + "/" + id, token, resource[1]))
                    .andExpect(status().isOk());
            mockMvc.perform(apiRequest(HttpMethod.DELETE, resource[0] + "/" + id, token, null))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void ordinaryMemberPayloadCannotSetRoleAndAdminRoleRouteWorks() throws Exception {
        String token = tokenFor(administrator);
        String memberPath = "/api/members/" + member.getId();
        String ordinaryUpdate = "{\"name\":\"Updated Profile\",\"email\":\"" + member.getEmail()
                + "\",\"status\":\"active\",\"ministry\":\"Choir\",\"smallGroup\":\"North\",\"lastAttended\":\"Jun 1\",\"role\":\"ADMIN\"}";

        mockMvc.perform(apiRequest(HttpMethod.PUT, memberPath, token, ordinaryUpdate))
                .andExpect(status().isOk());
        assertEquals(Role.MEMBER, memberRepository.findById(member.getId()).orElseThrow().getRole());
        assertEquals("Updated Profile", memberRepository.findById(member.getId()).orElseThrow().getName());

        mockMvc.perform(apiRequest(HttpMethod.PUT, memberPath,
                        tokenFor(member), ordinaryUpdate))
                .andExpect(status().isForbidden());
        mockMvc.perform(apiRequest(HttpMethod.PUT,
                        "/api/members/" + administrator.getId(),
                        tokenFor(member), ordinaryUpdate))
                .andExpect(status().isForbidden());
        mockMvc.perform(apiRequest(HttpMethod.PUT,
                        "/api/admin/members/" + administrator.getId() + "/role",
                        tokenFor(member), "{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(apiRequest(HttpMethod.PUT,
                        "/api/admin/members/" + member.getId() + "/role",
                        token, "{\"role\":\"PASTOR\"}"))
                .andExpect(status().isOk());
        assertEquals(Role.PASTOR, memberRepository.findById(member.getId()).orElseThrow().getRole());
    }

    @Test
    void privilegedNonMemberRoleCanManageResources() throws Exception {
        mockMvc.perform(apiRequest(HttpMethod.POST, "/api/donations", tokenFor(treasurer),
                        "{\"donor\":\"Donor\",\"fund\":\"General\",\"amount\":10,\"date\":\"Jun 1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void disabledAccountsCannotLoginOrUsePreviouslyIssuedTokens() throws Exception {
        String token = tokenFor(member);
        mockMvc.perform(postLogin(member.getEmail()))
                .andExpect(status().isOk());

        member.setEnabled(false);
        memberRepository.saveAndFlush(member);

        mockMvc.perform(postLogin(member.getEmail()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        member.setEnabled(true);
        memberRepository.saveAndFlush(member);
        mockMvc.perform(postLogin(member.getEmail()))
                .andExpect(status().isOk());
    }

    @Test
    void invalidAndExpiredTokensReturnUnauthorizedWithoutContinuing() throws Exception {
        String validToken = tokenFor(member);
        SecretKey testKey = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        SecretKey unrelatedKey = Keys.hmacShaKeyFor(
                "unrelated-integration-key-9182b40fd9a3".getBytes(StandardCharsets.UTF_8));
        String expired = signedToken(testKey, member.getEmail(), System.currentTimeMillis() - 1000);
        String wrongSignature = signedToken(unrelatedKey, member.getEmail(), System.currentTimeMillis() + 60_000);
        String missingUser = signedToken(testKey, "missing@example.test", System.currentTimeMillis() + 60_000);

        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + validToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/members"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer malformed"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer "))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + wrongSignature))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + missingUser))
                .andExpect(status().isUnauthorized());

        memberRepository.delete(member);
        mockMvc.perform(get("/api/members").header("Authorization", "Bearer " + validToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void roleReadsRemainExplicitAndAnonymousAccessIsRejected() throws Exception {
        String token = tokenFor(member);
        for (String path : new String[]{
                "/api/dashboard/kpis", "/api/dashboard/attendance-trend", "/api/events/upcoming",
                "/api/care/alerts", "/api/attendance/services", "/api/funds", "/api/reports",
                "/api/events", "/api/donations", "/api/volunteers", "/api/communications"}) {
            mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
            mockMvc.perform(get(path)).andExpect(MockMvcResultMatchers.status().isUnauthorized());
        }
    }

    private Member saveMember(String email, Role role) {
        Member user = new Member("Test User", "active", "Choir", "North", "Jun 1");
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        user.setEnabled(true);
        return memberRepository.saveAndFlush(user);
    }

    private String tokenFor(Member user) {
        return jwtService.generateToken(User.withUsername(user.getEmail())
                .password("unused")
                .authorities("ROLE_" + user.getRole().name())
                .build());
    }

    private MockHttpServletRequestBuilder apiRequest(HttpMethod method, String path, String token, String body) {
        MockHttpServletRequestBuilder request = request(method, path)
                .header("Authorization", "Bearer " + token);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return request;
    }

        private MockHttpServletRequestBuilder postLogin(String email) {
                return request(HttpMethod.POST, "/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}");
    }

    private String signedToken(SecretKey key, String subject, long expiration) {
        return Jwts.builder()
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis() - 5000))
                .expiration(new Date(expiration))
                .signWith(key)
                .compact();
    }
}