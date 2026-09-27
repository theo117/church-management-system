package com.churchmanagement.api.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            CustomUserDetailsService userDetailsService) {

        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authHeader.startsWith("Bearer ") || authHeader.substring(7).isBlank()) {
            reject(response);
            return;
        }

        try {
            String jwt = authHeader.substring(7);
            String username = jwtService.extractUsername(jwt);

            if (username == null || username.isBlank()) {
                reject(response);
                return;
            }

            UserDetails user = userDetailsService.loadUserByUsername(username);

            if (!user.isEnabled() || !jwtService.isTokenValid(jwt, user)) {
                reject(response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                user.getAuthorities());

                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request));

                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);
            }
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException exception) {
            reject(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response) throws IOException {
        SecurityContextHolder.clearContext();
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
    }
}