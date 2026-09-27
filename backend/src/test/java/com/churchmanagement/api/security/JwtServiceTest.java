package com.churchmanagement.api.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtServiceTest {
    private static final String SECRET = "test-runtime-signing-key-6f6b1e908ad34b12";

    @Test
    void configuredSecretSignsAndValidatesToken() {
        JwtService jwtService = new JwtService(SECRET);
        UserDetails user = User.withUsername("member@example.test")
                .password("unused")
                .roles("MEMBER")
                .build();

        String token = jwtService.generateToken(user);

        assertEquals("member@example.test", jwtService.extractUsername(token));
        assertEquals(true, jwtService.isTokenValid(token, user));
    }

    @Test
    void missingBlankPlaceholderAndWeakSecretsFailInitialization() {
        assertThrows(IllegalStateException.class, () -> new JwtService(null));
        assertThrows(IllegalStateException.class, () -> new JwtService("  "));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("development-secret-key-that-is-long-enough"));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("short-but-not-placeholder"));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("abcdefghijklmnopqrstuvwxyzABCDEF"));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("this-is-a-secret-placeholder-value-123456"));
    }

    @Test
    void tokenSignedWithUnrelatedKeyIsRejected() {
        JwtService jwtService = new JwtService(SECRET);
        SecretKey oldKey = Keys.hmacShaKeyFor(
                "unrelated-runtime-key-40558f06a71c4ab1".getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("member@example.test")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(oldKey)
                .compact();

        assertThrows(RuntimeException.class, () -> jwtService.extractUsername(token));
    }

        @Test
        void missingAndPlaceholderRuntimePropertiesFailBeanInitialization() {
                ApplicationContextRunner contextRunner = new ApplicationContextRunner()
                                .withUserConfiguration(JwtServiceConfiguration.class);

                contextRunner.run(context -> assertTrue(context.getStartupFailure() != null));
                contextRunner.withPropertyValues("JWT_SECRET=replace-this-with-a-real-secret-value")
                                .run(context -> assertTrue(context.getStartupFailure() != null));
                contextRunner.withPropertyValues("JWT_SECRET=" + SECRET)
                                .run(context -> assertTrue(context.getStartupFailure() == null));
        }

        @Configuration(proxyBeanMethods = false)
        @Import(JwtService.class)
        static class JwtServiceConfiguration {
        }
}