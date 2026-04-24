from flask import current_app, request
import jwt
import datetime
from .models import User
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import dns.resolver
import firebase_admin
from firebase_admin import auth
from fpdf import FPDF
import io
from email.mime.base import MIMEBase
from email import encoders
import os
import requests
from typing import Tuple, Optional
from threading import Thread


# Load disposable email domains into a set for O(1) lookups
with open(os.path.join(os.path.dirname(__file__), 'domains.txt'), 'r') as f:
    DISPOSABLE_DOMAINS = {line.strip().lower() for line in f if line.strip()}

def safe_log(message, sensitive_data=None):
    if sensitive_data:
        if isinstance(sensitive_data, dict):
            sensitive_keys = ['password', 'token', 'secret', 'credit_card']
            redacted_data = {k: '***REDACTED***' if k in sensitive_keys else v 
                             for k, v in sensitive_data.items()}
            message = message.replace(str(sensitive_data), str(redacted_data))
        else:
            message = message.replace(str(sensitive_data), '***')
    current_app.logger.info(message)


def generate_token(data, expires_in_seconds=3600):
    """Generates a JWT token for app session management."""
    return jwt.encode({
        **data,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in_seconds)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    """Decodes an app-specific JWT token."""
    return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'],leeway=10)

def get_current_user():
    """Helper to get the current user from the app-specific auth token."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    try:
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        return User.query.filter_by(uid=payload['user_id']).first() # user_id is the UID from Firebase
    except Exception:
        return None

def send_email(subject, recipients, html_body, sender, attachments=None):
    """
    Sends an email using the configured SMTP server with smtplib.
    'attachments' should be a list of dictionaries: 
    [{'filename': 'receipt.pdf', 'content': b'...', 'mimetype': 'application/pdf'}]
    """
    mail_server = current_app.config.get('MAIL_SERVER')
    mail_port = current_app.config.get('MAIL_PORT')
    mail_username = current_app.config.get('MAIL_USERNAME')
    mail_password = current_app.config.get('MAIL_PASSWORD')
    mail_use_tls = current_app.config.get('MAIL_USE_TLS', True)

    if not all([mail_server, mail_port, mail_username, mail_password]):
        current_app.logger.error("Mail server not fully configured. Please set MAIL_ values in .env")
        raise ConnectionError("Mail server not configured.")
        
    sender_name, sender_email = sender
    
    # Create a multipart message
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = f"{sender_name} <{sender_email}>"
    msg['To'] = ", ".join(recipients)
    
    # Attach the HTML body
    msg.attach(MIMEText(html_body, 'html'))

    # Attach any files
    if attachments:
        for attachment in attachments:
            part = MIMEBase(*attachment['mimetype'].split('/'))
            part.set_payload(attachment['content'])
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{attachment["filename"]}"',
            )
            msg.attach(part)

    try:
        # Establish a secure session with the SMTP server
        with smtplib.SMTP(mail_server, int(mail_port)) as server:
            if mail_use_tls:
                server.starttls()  # Secure the connection
            server.login(mail_username, mail_password)
            server.send_message(msg)
            current_app.logger.info(f"Email sent successfully to {recipients}")
            
    except smtplib.SMTPException as e:
        current_app.logger.error(f"SMTP error occurred: {e}", exc_info=True)
        raise ConnectionError(f"Failed to send email: {e}")
    except Exception as e:
        current_app.logger.error(f"An unexpected error occurred during email sending: {e}", exc_info=True)
        # Re-raise the exception to be caught by the route handler
        return True

def send_email_async(subject, recipients, html_body, sender, attachments=None):
    """
    Sends an email asynchronously by spawning a daemon thread.
    Pushes the current application context so the thread can access mail config.
    """
    app = current_app._get_current_object()
    
    def _send_async(app, subject, recipients, html_body, sender, attachments):
        with app.app_context():
            try:
                send_email(subject, recipients, html_body, sender, attachments)
            except Exception as e:
                app.logger.error(f"Async email sending failed: {e}")
                
    thread = Thread(target=_send_async, args=(app, subject, recipients, html_body, sender, attachments))
    thread.daemon = True
    thread.start()
    return thread


def auth_email(content):
    """Create professional email template with header and footer"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
    </head>
    <body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:0 0;">
            <tr>
                <td align="center">
                    <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.1); max-width: 100%;">
                        <tr>
                            <td style="padding:10px 20px; text-align:left; background-color: #ffffff;">
                                <img class="header-img" src="{os.getenv('EMAIL_HEADER_IMAGE', 'https://hustloop.com/logo.png')}" alt="Hustloop" style="width:60%; max-width:600px; height:auto; object-fit:contain;">
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td class="content" style="padding:30px 20px;">
                                <div style="color:#333333; line-height:1.6; font-size:15px;">
                                    {content}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="footer" style="padding:24px 20px 10px;text-align:center;border-top:1px solid #e5e7eb;">
                                <div style="margin-bottom:14px;">
                                    <a href="{os.getenv('X_LINK', 'https://x.com/hustloop')}" target="_blank" class="social-links" style="text-decoration:none;margin:0 8px;">
                                        <img class="social-img" src="{os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')}"
                                             alt="X" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                    <a href="{os.getenv('LINKEDIN_LINK', 'https://linkedin.com/company/hustloop')}" target="_blank" class="social-links" style="text-decoration:none;margin:0 8px;">
                                        <img class="social-img" src="{os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')}"
                                             alt="LinkedIn" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                    <a href="{os.getenv('INSTAGRAM_LINK', 'https://instagram.com/hustloop_official')}" target="_blank" class="social-links" style="text-decoration:none;margin:0 8px;">
                                        <img class="social-img" src="{os.getenv('INSTAGRAM_ICON', 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png')}"
                                             alt="Instagram" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                    <a href="{os.getenv('YOUTUBE_LINK', 'https://youtube.com/@hustloop_talks')}" target="_blank" class="social-links" style="text-decoration:none;margin:0 8px;">
                                        <img class="social-img" src="{os.getenv('YOUTUBE_ICON', 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png')}"
                                             alt="YouTube" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                </div>
                                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                                    <a href="https://hustloop.com/incentive-challenge" style="color:#2563eb;text-decoration:none;">Incentive Challenges</a> |
                                    <a href="https://hustloop.com/terms-of-service" style="color:#2563eb;text-decoration:none;">Terms of Service</a> |
                                    <a href="https://hustloop.com/privacy-policy" style="color:#2563eb;text-decoration:none;">Privacy Policy</a>
                                </p>
                                <p style="margin:10px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                                    © {datetime.datetime.now().year} Hustloop | Salem, IN. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def blog_email(content):
    """Create professional email template with header and footer"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@900&display=swap');
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Space Mono', Courier, monospace;
                background-color: #e5e5e5;
                color: #000;
            }}
            .email-wrapper {{
                padding: 40px 20px;
                background-color: #e5e5e5;
            }}
            .email-container {{
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                border: 4px solid #000;
                background-color: #fff;
                box-shadow: 8px 8px 0px #000;
            }}
            .header {{
                padding: 20px;
                border-bottom: 4px solid #000;
                background-color: #fff;
                text-align: center;
            }}
            .header-img {{
                max-height: 60px;
                display: block;
                margin: 0 auto;
            }}
            .blog-badge {{
                background-color: #000;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
                padding: 15px;
                font-size: 24px;
                text-align: center;
                border-bottom: 4px solid #000;
            }}
            .blog-badge span {{
                background-color: #ffeb3b;
                color: #000;
                padding: 2px 10px;
                border: 2px solid #000;
            }}
            .content {{
                padding: 40px 30px;
                font-size: 16px;
                line-height: 1.6;
            }}
            .content h1, .content h2, .content h3 {{
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                text-transform: uppercase;
                margin-top: 0;
            }}
            .content p {{
                margin-top: 0;
                margin-bottom: 20px;
            }}
            .content a {{
                color: #000;
                background-color: #ffeb3b;
                text-decoration: none;
                font-weight: bold;
                padding: 2px 5px;
                border: 2px solid #000;
                display: inline-block;
            }}
            .content a:hover {{
                background-color: #000;
                color: #fff;
            }}
            .footer {{
                padding: 30px 20px;
                border-top: 4px solid #000;
                background-color: #fff;
                text-align: center;
            }}
            .social-links {{
                margin-bottom: 20px;
            }}
            .social-links a {{
                display: inline-block;
                margin: 0 10px;
                border: 3px solid #000;
                padding: 10px;
                background-color: #fff;
                transition: transform 0.2s;
                box-shadow: 4px 4px 0px #000;
            }}
            .social-links a:hover {{
                background-color: #ffeb3b;
                transform: translate(-2px, -2px);
                box-shadow: 6px 6px 0px #000;
            }}
            .social-img {{
                width: 24px;
                height: 24px;
                display: block;
                filter: grayscale(100%) contrast(200%);
            }}
            .footer-links {{
                margin-bottom: 30px;
            }}
            .footer-links a {{
                color: #000;
                text-decoration: none;
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
                margin: 0 10px;
                border-bottom: 3px solid #000;
            }}
            .copyright {{
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                background-color: #000;
                color: #fff;
                padding: 15px;
                margin: -30px -20px;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#e5e5e5;">
        <div class="email-wrapper" style="padding: 40px 20px; background-color: #e5e5e5;">
            <table class="email-container" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%; max-width: 600px; border: 4px solid #000; background-color: #fff; box-shadow: 8px 8px 0px #000;">
                <tr>
                    <td class="header" style="padding: 20px; border-bottom: 4px solid #000; text-align: center;">
                        <img class="header-img" src="{os.getenv('EMAIL_HEADER_IMAGE', 'https://hustloop.com/logo.png')}" alt="Hustloop" style="max-height: 60px; margin: 0 auto; display: block;">
                    </td>
                </tr>
                <tr>
                    <td class="blog-badge" style="background-color: #000; color: #fff; font-family: 'Inter', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 15px; font-size: 24px; text-align: center; border-bottom: 4px solid #000;">
                        <span>UPDATE</span>
                    </td>
                </tr>
                <tr>
                    <td class="content" style="padding: 40px 30px; font-family: 'Space Mono', Courier, monospace; font-size: 16px; line-height: 1.6; color: #000;">
                        {content}
                    </td>
                </tr>
                <tr>
                    <td class="footer" style="padding: 30px 20px; border-top: 4px solid #000; background-color: #fff; text-align: center; font-family: 'Space Mono', Courier, monospace;">
                        <div class="social-links" style="margin-bottom: 20px;">
                            <a href="{os.getenv('X_LINK', 'https://x.com/hustloop')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')}" alt="X" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('LINKEDIN_LINK', 'https://linkedin.com/company/hustloop')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')}" alt="LinkedIn" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('INSTAGRAM_LINK', 'https://instagram.com/hustloop_official')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('INSTAGRAM_ICON', 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png')}" alt="Instagram" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('YOUTUBE_LINK', 'https://youtube.com/@hustloop_talks')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('YOUTUBE_ICON', 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png')}" alt="YouTube" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                        </div>
                        <div class="footer-links" style="margin-bottom: 30px;">
                            <a href="https://hustloop.com/incentive-challenges" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Incentive Challenges</a>
                            <a href="https://hustloop.com/terms-of-service" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Terms of Service</a>
                            <a href="https://hustloop.com/privacy-policy" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Privacy Policy</a>
                        </div>
                        <div class="copyright" style="background-color: #000; color: #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; padding: 15px; margin: 20px -20px -30px -20px;">
                            © {datetime.datetime.now().year} HUSTLOOP | SALEM, IN. ALL RIGHTS RESERVED.
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    """

def brutalism_action_email(content, title="SUCCESS"):
    """Create professional action email template with brutalist UI, same footer/logo as blog_email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@900&display=swap');
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Space Mono', Courier, monospace;
                background-color: #c4b5fd; /* purple-200 */
                color: #000;
            }}
            .email-wrapper {{
                padding: 40px 20px;
                background-color: #c4b5fd;
            }}
            .email-container {{
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                border: 4px solid #000;
                background-color: #fff;
                box-shadow: 8px 8px 0px #000;
            }}
            .header {{
                padding: 20px;
                border-bottom: 4px solid #000;
                background-color: #fff;
                text-align: center;
            }}
            .header-img {{
                max-height: 60px;
                display: block;
                margin: 0 auto;
            }}
            .action-badge {{
                background-color: #8b5cf6; /* purple-500 */
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
                padding: 15px;
                font-size: 24px;
                text-align: center;
                border-bottom: 4px solid #000;
            }}
            .action-badge span {{
                background-color: #fff;
                color: #000;
                padding: 2px 10px;
                border: 2px solid #000;
            }}
            .content {{
                padding: 40px 30px;
                font-size: 16px;
                line-height: 1.6;
            }}
            .content h1, .content h2, .content h3 {{
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                text-transform: uppercase;
                margin-top: 0;
            }}
            .content p {{
                margin-top: 0;
                margin-bottom: 20px;
            }}
            .content a.btn {{
                color: #fff;
                background-color: #8b5cf6;
                text-decoration: none;
                font-weight: bold;
                padding: 10px 15px;
                border: 3px solid #000;
                display: inline-block;
                transition: transform 0.2s;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .content a.btn:hover {{
                box-shadow: 4px 4px 0px #000;
                transform: translate(-2px, -2px);
                background-color: #6d28d9;
            }}
            .footer {{
                padding: 30px 20px;
                border-top: 4px solid #000;
                background-color: #fff;
                text-align: center;
            }}
            .social-links {{ margin-bottom: 20px; }}
            .social-links a {{
                display: inline-block;
                margin: 0 10px;
                border: 3px solid #000;
                padding: 10px;
                background-color: #fff;
                transition: transform 0.2s;
                box-shadow: 4px 4px 0px #000;
            }}
            .social-links a:hover {{
                background-color: #ffeb3b;
                transform: translate(-2px, -2px);
                box-shadow: 6px 6px 0px #000;
            }}
            .social-img {{
                width: 24px;
                height: 24px;
                display: block;
                filter: grayscale(100%) contrast(200%);
            }}
            .footer-links {{ margin-bottom: 30px; }}
            .footer-links a {{
                color: #000;
                text-decoration: none;
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
                margin: 0 10px;
                border-bottom: 3px solid #000;
                background-color: transparent;
                padding: 0;
                display: inline;
            }}
            .footer-links a:hover {{
                box-shadow: none;
                transform: none;
            }}
            .copyright {{
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                background-color: #000;
                color: #fff;
                padding: 15px;
                margin: -30px -20px;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#c4b5fd;">
        <div class="email-wrapper" style="padding: 40px 20px; background-color: #c4b5fd;">
            <table class="email-container" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%; max-width: 600px; border: 4px solid #000; background-color: #fff; box-shadow: 8px 8px 0px #000;">
                <tr>
                    <td class="header" style="padding: 20px; border-bottom: 4px solid #000; text-align: center;">
                        <img class="header-img" src="{os.getenv('EMAIL_HEADER_IMAGE', 'https://hustloop.com/logo.png')}" alt="Hustloop" style="max-height: 60px; margin: 0 auto; display: block;">
                    </td>
                </tr>
                <tr>
                    <td class="action-badge" style="background-color: #8b5cf6; color: #fff; font-family: 'Inter', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 15px; font-size: 24px; text-align: center; border-bottom: 4px solid #000;">
                        <span>{title}</span>
                    </td>
                </tr>
                <tr>
                    <td class="content" style="padding: 40px 30px; font-family: 'Space Mono', Courier, monospace; font-size: 16px; line-height: 1.6; color: #000;">
                        {content}
                    </td>
                </tr>
                <tr>
                    <td class="footer" style="padding: 30px 20px; border-top: 4px solid #000; background-color: #fff; text-align: center; font-family: 'Space Mono', Courier, monospace;">
                        <div class="social-links" style="margin-bottom: 20px;">
                            <a href="{os.getenv('X_LINK', 'https://x.com/hustloop')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')}" alt="X" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('LINKEDIN_LINK', 'https://linkedin.com/company/hustloop')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')}" alt="LinkedIn" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('INSTAGRAM_LINK', 'https://instagram.com/hustloop_official')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('INSTAGRAM_ICON', 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png')}" alt="Instagram" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                            <a href="{os.getenv('YOUTUBE_LINK', 'https://youtube.com/@hustloop_talks')}" target="_blank" style="display: inline-block; margin: 0 10px; border: 3px solid #000; padding: 10px; box-shadow: 4px 4px 0px #000;">
                                <img class="social-img" src="{os.getenv('YOUTUBE_ICON', 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png')}" alt="YouTube" style="width: 24px; height: 24px; display: block; filter: grayscale(100%) contrast(200%);">
                            </a>
                        </div>
                        <div class="footer-links" style="margin-bottom: 30px;">
                            <a href="https://hustloop.com/incentive-challenges" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Incentive Challenges</a>
                            <a href="https://hustloop.com/terms-of-service" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Terms of Service</a>
                            <a href="https://hustloop.com/privacy-policy" style="color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 0 10px; border-bottom: 3px solid #000; font-size: 14px;">Privacy Policy</a>
                        </div>
                        <div class="copyright" style="background-color: #000; color: #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; padding: 15px; margin: 20px -20px -30px -20px;">
                            © {datetime.datetime.now().year} HUSTLOOP | SALEM, IN. ALL RIGHTS RESERVED.
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    """

def collaboration_email(content):
    """Create professional email template for collaboration emails with different UI"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f0f9ff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff; padding:20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 25px rgba(59, 130, 246, 0.15); border: 1px solid #e0f2fe;">
                        <!-- Collaboration Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding:35px 20px; text-align:center;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE', 'https://hustloop.com/logo.png')}" alt="Hustloop" style="max-height:50px; width:auto;">
                            </td>
                        </tr>
                        
                        <!-- Collaboration Badge -->
                        <tr>
                            <td style="background-color: #ecfeff; padding:18px 20px; text-align:center; border-bottom: 1px solid #bae6fd;">
                                <div style="display: flex; align-items: center; justify-content: center; color: #0369a1; font-size: 14px; font-weight: 600;">
                                    <span style="margin-right: 8px;">💡</span>
                                    INNOVATION & PARTNERSHIP OPPORTUNITY
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding:35px 25px; background-color: #ffffff;">
                                <div style="color:#1e293b; line-height:1.8; font-size:16px;">
                                    {content}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Collaboration Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding:25px 20px; text-align:center; border-top: 1px solid #e2e8f0;">
                                <div style="margin-bottom:20px;">
                                    <div style="color: #475569; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
                                        Connect & Collaborate
                                    </div>
                                    <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
                                        Join thousands of innovators and partners on Hustloop
                                    </p>
                                </div>
                                
                                <!-- Social Links -->
                                <div style="margin-bottom:20px;">
                                    <a href="{os.getenv('X_LINK', 'https://x.com/hustloop')}" target="_blank" style="text-decoration:none;margin:0 10px;">
                                        <img src="{os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')}"
                                             alt="X" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                    <a href="{os.getenv('LINKEDIN_LINK', 'https://linkedin.com/company/hustloop')}" target="_blank" style="text-decoration:none;margin:0 10px;">
                                        <img src="{os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')}"
                                             alt="LinkedIn" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                    <a href="{os.getenv('INSTAGRAM_LINK', 'https://instagram.com/hustloop_official')}" target="_blank" style="text-decoration:none;margin:0 10px;">
                                        <img src="{os.getenv('INSTAGRAM_ICON', 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png')}"
                                             alt="Instagram" style="width:22px;height:22px;vertical-align:middle;">
                                    </a>
                                </div>
                                
                                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                                    <a href="https://hustloop.com/incentive-challenge" style="color:#475569;text-decoration:none;">Incentive Challenges</a> | 
                                    <a href="https://hustloop.com/terms-of-service" style="color:#475569;text-decoration:none;">Terms</a> | 
                                    <a href="https://hustloop.com/privacy-policy" style="color:#475569;text-decoration:none;">Privacy</a>
                                </p>
                                
                                <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
                                    © {datetime.datetime.now().year} Hustloop | Salem. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """




def is_temporary_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Check if an email is from a temporary/disposable email service using local domain list.
    
    Args:
        email (str): The email address to check
        
    Returns:
        Tuple[bool, Optional[str]]: (is_temporary, message)
    """
    try:
        # Extract domain from email and convert to lowercase for case-insensitive matching
        domain = email.split('@')[-1].lower()
        
        # Check against our local disposable domains list
        if domain in DISPOSABLE_DOMAINS:
            return True, 'Disposable email addresses are not allowed'
            
        return False, None
        
    except Exception as e:
        current_app.logger.error(f"Error checking temporary email: {str(e)}")
        return False, None

def generate_receipt_pdf(user, plan, payment, subscription):
    pdf = FPDF(orientation='P', unit='mm', format='A5')
    pdf.add_page()

    try:
        pdf.image("https://hustloop.com/logo.png", x=10, y=10, w=50)
    except Exception:
        pdf.set_font("Helvetica", 'B', 16)
        pdf.text(10, 15, "HUSTLOOP")

    pdf.ln(5)
    pdf.set_font("Helvetica", 'B', 14)
    pdf.cell(0, 10, "INVOICE / RECEIPT", ln=True, align='R')

    pdf.set_font("Helvetica", '', 9)
    pdf.cell(0, 5, f"Date: {datetime.datetime.utcnow().strftime('%d %b %Y')}", ln=True, align='R')

    payment_id = getattr(payment, 'razorpay_payment_id', None)
    payment_db_id = getattr(payment, 'id', None)
    inv_no = f"INV-{payment_id[-6:].upper()}" if payment_id else f"INV-{payment_db_id or 'TEMP'}"
    pdf.cell(0, 5, f"No: {inv_no}", ln=True, align='R')

    pdf.ln(15)

    pdf.set_font("Helvetica", 'B', 10)
    pdf.cell(0, 8, "BILL TO:", ln=True)
    pdf.set_font("Helvetica", '', 10)
    pdf.cell(0, 6, getattr(user, 'name', ''), ln=True)
    pdf.cell(0, 6, getattr(user, 'email', ''), ln=True)

    pdf.ln(10)

    pdf.set_fill_color(240, 240, 240)
    pdf.set_font("Helvetica", 'B', 10)
    pdf.cell(80, 10, " Description", fill=True)
    pdf.cell(48, 10, "Amount ", ln=True, align='R', fill=True)

    pdf.set_font("Helvetica", '', 10)

    amount = getattr(payment, 'amount', 0) or 0
    base_amount = getattr(payment, 'base_amount', None)
    tax_amount = getattr(payment, 'tax_amount', 0) or 0
    base_price = base_amount if base_amount is not None else amount

    tax_percentage = getattr(plan, 'tax_percentage', None) or 18
    plan_name = getattr(plan, 'name', 'Subscription')

    pdf.cell(80, 10, f" {plan_name} Subscription", border='B')
    pdf.cell(48, 10, f"INR {base_price / 100:.2f} ", border='B', ln=True, align='R')

    pdf.cell(80, 10, f" GST ({tax_percentage}%)", border='B')
    pdf.cell(48, 10, f"INR {tax_amount / 100:.2f} ", border='B', ln=True, align='R')

    pdf.ln(5)

    pdf.set_font("Helvetica", '', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f"Payment ID: {payment_id or 'N/A'}", ln=True)

    start_date = getattr(subscription, 'start_date', None)
    end_date = getattr(subscription, 'end_date', None)

    if isinstance(start_date, str):
        start_date = datetime.datetime.fromisoformat(start_date)
    if isinstance(end_date, str):
        end_date = datetime.datetime.fromisoformat(end_date)
    if start_date and end_date:
        pdf.cell(0, 5, f"Validity: {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}", ln=True)

    pdf.ln(10)

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", 'B', 12)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(80, 12, " Total Paid (Inc. GST)", fill=True)
    pdf.cell(48, 12, f"INR {amount / 100:.2f} ", ln=True, align='R', fill=True)

    pdf.ln(15)
    pdf.set_font("Helvetica", 'I', 8)
    pdf.cell(0, 5, "Thank you for being part of Hustloop!", ln=True, align='C')
    pdf.cell(0, 5, "Questions? support@hustloop.com", ln=True, align='C')

    return pdf.output(dest="S").encode("latin1")


def validate_email_mx(email):
    """Validates email format, checks for disposable domains, and verifies MX records."""
    # Regex for basic email format validation
    if not re.match(r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)", email):
        return False, "Please enter a valid email address."

    domain = email.split('@')[1]

    # Check against a list of disposable email domains
    disposable_domains = {
        'mailinator.com', 'temp-mail.org', '10minutemail.com', 
        'guerrillamail.com', 'sharklasers.com', 'getnada.com',
        'yopmail.com', 'maildrop.cc'
    }
    if domain in disposable_domains:
        return False, "Disposable email addresses are not allowed."

    # Check for MX records
    try:
        dns.resolver.resolve(domain, 'MX')
        return True, ""
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
        return False, "The domain for this email address does not seem to exist or cannot receive mail."
    except dns.exception.Timeout:
        current_app.logger.warning(f"DNS lookup timed out for domain: {domain}")
        # In case of a timeout, we might cautiously allow it to avoid blocking legitimate users
        # due to temporary network issues, but log it.
        return True, ""
    except Exception as e:
        current_app.logger.error(f"An unexpected error occurred during DNS lookup for {domain}: {e}")
        # Fail open in case of unexpected errors to avoid user frustration
        return True, ""
    

