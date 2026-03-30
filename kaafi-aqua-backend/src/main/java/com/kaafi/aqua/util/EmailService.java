package com.kaafi.aqua.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    public void sendPasswordResetEmail(String to, String token) {
        try {
            String resetUrl = "http://localhost:5173/reset-password?token=" + token;
            String subject = "Password Reset Request - Kaafi Aqua";
            String content = "<html><body>" +
                "<h2>Password Reset Request</h2>" +
                "<p>You requested to reset your password. Click the link below to proceed:</p>" +
                "<a href='" + resetUrl + "'>Reset Password</a>" +
                "<p>This link will expire in 24 hours.</p>" +
                "<p>If you did not request this, please ignore this email.</p>" +
                "<br><p>Best regards,<br>Kaafi Aqua Team</p>" +
                "</body></html>";
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            
            mailSender.send(message);
            log.info("Password reset email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", to, e);
        }
    }
}