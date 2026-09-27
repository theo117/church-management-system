package com.churchmanagement.api.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Locale;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;

    public JwtService(@Value("${JWT_SECRET:}") String secret) {
    String normalized = secret == null
        ? ""
        : secret.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    if (secret == null
        || secret.isBlank()
        || normalized.contains("development")
        || normalized.contains("placeholder")
        || normalized.contains("changeme")
        || normalized.contains("replace")
        || normalized.contains("example")
        || normalized.contains("your")
        || normalized.contains("default")
                || normalized.contains("secret")
        || secret.getBytes(StandardCharsets.UTF_8).length < 32
                || normalized.chars().distinct().count() < 12
                || hasObviousSequence(normalized)) {
        throw new IllegalStateException(
            "JWT_SECRET must be a strong, non-placeholder secret of at least 32 UTF-8 bytes");
    }
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private boolean hasObviousSequence(String value) {
        int sequenceLength = 1;
        for (int index = 1; index < value.length(); index++) {
            int difference = value.charAt(index) - value.charAt(index - 1);
            sequenceLength = Math.abs(difference) == 1 ? sequenceLength + 1 : 1;
            if (sequenceLength >= 12) {
                return true;
            }
        }
        return false;
    }

    public String generateToken(UserDetails user) {

        long now = System.currentTimeMillis();

        return Jwts.builder()
                .subject(user.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(now + 1000L * 60 * 60 * 24)) // 24 hours
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {

        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails user) {
        Claims claims = extractClaims(token);
        Date expiration = claims.getExpiration();
        return claims.getSubject() != null
            && claims.getSubject().equals(user.getUsername())
            && expiration != null
            && expiration.after(new Date());
    }

    private Claims extractClaims(String token) {

        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}