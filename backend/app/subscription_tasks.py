from datetime import datetime, timedelta
import os

from app.extensions import db
from app.models import IST, UserSubscription, User
from app.utils import send_email
from flask import current_app

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

def expire_all_subscriptions():
    """Expire all subscriptions past their end_date"""
    from datetime import datetime
    expired_count = 0
    
    active_subscriptions = UserSubscription.query.filter_by(status='active').all()
    
    for subscription in active_subscriptions:
        if subscription.is_expired():
            subscription.status = 'expired'
            expired_count += 1
    
    if expired_count > 0:
        db.session.commit()
    
    return expired_count


def send_expiration_warning_email(user_email, user_name, plan_name, days_remaining, end_date):
    """Send email warning to user about upcoming expiration"""
    subject = f"Your {plan_name} subscription expires in {days_remaining} days"
    
    import os
    logo_url = os.getenv('EMAIL_HEADER_IMAGE', 'https://api.hustloop.com/static/images/logo.png')
    linkedin_link = os.getenv('LINKEDIN_LINK', 'https://www.linkedin.com/company/hustloop/')
    linkedin_icon = os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')
    x_link = os.getenv('X_LINK', 'https://x.com/hustloop')
    x_icon = os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')
    instagram_link = 'https://www.instagram.com/hustloop_official'
    instagram_icon = 'https://cdn-icons-png.flaticon.com/512/174/174855.png'
    website_link = os.getenv('WEBSITE_LINK', 'https://hustloop.com')

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                <!-- Header -->
                <div style="padding: 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <a href="{website_link}">
                        <img src="{logo_url}" alt="Hustloop Logo" style="height: 50px; width: auto;">
                    </a>
                </div>

                <!-- Main Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Subscription Expiration Notice</h2>
                    <p>Hi {user_name},</p>
                    <p>Your <strong>{plan_name}</strong> subscription will expire on <strong>{end_date.strftime('%B %d, %Y')}</strong>.</p>
                    <p>That's in <strong>{days_remaining} days</strong>!</p>
                    <p>To continue enjoying our services without interruption, please renew your subscription.</p>
                    <div style="margin: 35px 0; text-align: center;">
                        <a href="{website_link}/pricing" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Renew Now</a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">If you have any questions or need assistance, feel free to contact our support team.</p>
                    <p style="margin-top: 30px;">Best regards,<br><strong>The Hustloop Team</strong></p>
                </div>

                <!-- Footer -->
                <div style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <a href="{linkedin_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{linkedin_icon}" alt="LinkedIn" style="width: 24px; height: 24px;">
                        </a>
                        <a href="{x_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{x_icon}" alt="X" style="width: 24px; height: 24px;">
                        </a>
                        <a href="{instagram_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{instagram_icon}" alt="Instagram" style="width: 24px; height: 24px;">
                        </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        &copy; {datetime.now(IST).year} Hustloop. All rights reserved.<br>
                        Smart hustle. Infinite growth.
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    
    send_email(
        subject=subject,
        recipients=[user_email],
        html_body=html_body,
        sender=("Hustloop", current_app.config['MAIL_USERNAME'])
    )


def send_admin_expiration_report(expiring_subscriptions, expired_users):
    """Send daily report to admin about expiring/expired subscriptions"""
    
    # Get all admin users' emails
    admin_users = User.query.filter_by(role='admin').all()
    if not admin_users:
        safe_log("No admin users found to send expiration report")
        return
    
    admin_emails = [admin.email for admin in admin_users]
    
    logo_url = os.getenv('EMAIL_HEADER_IMAGE', 'https://api.hustloop.com/static/images/logo.png')
    linkedin_link = os.getenv('LINKEDIN_LINK', 'https://www.linkedin.com/company/hustloop/')
    linkedin_icon = os.getenv('LINKEDIN_ICON', 'https://cdn-icons-png.flaticon.com/512/174/174857.png')
    x_link = os.getenv('X_LINK', 'https://x.com/hustloop')
    x_icon = os.getenv('X_ICON', 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png')
    instagram_link = 'https://www.instagram.com/hustloop_official'
    instagram_icon = 'https://cdn-icons-png.flaticon.com/512/174/174855.png'
    website_link = os.getenv('WEBSITE_LINK', 'https://hustloop.com')
    
    subject = f"Daily Subscription Report - {datetime.now(IST).strftime('%Y-%m-%d')}"
    
    # Section: Expiring Soon
    expiring_html = f"""
                <h3 style="color: #dc2626; margin-top: 30px;">Expiring Soon ({len(expiring_subscriptions)} subscriptions)</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">User</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Email</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Plan</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Days Left</th>
                        </tr>
                    </thead>
                    <tbody>
    """
    if not expiring_subscriptions:
        expiring_html += '<tr><td colspan="4" style="padding: 10px; text-align: center; border: 1px solid #ddd;">No subscriptions expiring soon</td></tr>'
    else:
        for sub in expiring_subscriptions:
            days_left = (sub.end_date - datetime.now(IST)).days
            expiring_html += f"""
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.user.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.user.email}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.plan.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{days_left}</td>
                        </tr>
            """
    expiring_html += "</tbody></table>"

    # Section: Expired Payment Users
    expired_html = f"""
                <h3 style="color: #16a34a; margin-top: 30px;">Expired Payment Users ({len(expired_users)} subscriptions)</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">User</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Email</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Plan</th>
                        </tr>
                    </thead>
                    <tbody>
    """
    if not expired_users:
        expired_html += '<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #ddd;">No expired payment users found</td></tr>'
    else:
        for sub in expired_users:
            expired_html += f"""
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.user.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.user.email}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{sub.plan.name}</td>
                        </tr>
            """
    expired_html += "</tbody></table>"

    # Assemble HTML blocks based on count
    if len(expired_users) >= len(expiring_subscriptions):
        content_html = expired_html + expiring_html
    else:
        content_html = expiring_html + expired_html

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 20px;">
            <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                <!-- Header -->
                <div style="padding: 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                    <a href="{website_link}">
                        <img src="{logo_url}" alt="Hustloop Logo" style="height: 50px; width: auto;">
                    </a>
                </div>

                <!-- Main Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Daily Subscription Report</h2>
                    <p><strong>Date:</strong> {datetime.now(IST).strftime('%B %d, %Y')}</p>
                    
                    {content_html}
                </div>

                <!-- Footer -->
                <div style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <a href="{linkedin_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{linkedin_icon}" alt="LinkedIn" style="width: 24px; height: 24px;">
                        </a>
                        <a href="{x_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{x_icon}" alt="X" style="width: 24px; height: 24px;">
                        </a>
                        <a href="{instagram_link}" style="text-decoration: none; margin: 0 10px;">
                            <img src="{instagram_icon}" alt="Instagram" style="width: 24px; height: 24px;">
                        </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        &copy; {datetime.now(IST).year} Hustloop. All rights reserved.<br>
                        Smart hustle. Infinite growth.
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    
    send_email(
        subject=subject,
        recipients=admin_emails,
        html_body=html_body,
        sender=("Hustloop System", current_app.config['MAIL_USERNAME'])
    )


def check_and_notify_subscriptions():
    """Daily task to check expiring subscriptions and send notifications"""
    from datetime import datetime, timedelta
    
    safe_log("Running daily subscription check...")
    
    # Find subscriptions expiring in 3 days
    ten_days_from_now = datetime.now(IST) + timedelta(days=10)
    expiring_soon = UserSubscription.query.filter(
        UserSubscription.status == 'active',
        UserSubscription.end_date <= ten_days_from_now,
        UserSubscription.end_date > datetime.now(IST)
    ).all()
    
    # Send warning emails to users
    for subscription in expiring_soon:
        try:
            days_remaining = (subscription.end_date - datetime.now(IST)).days
            send_expiration_warning_email(
                subscription.user.email,
                subscription.user.name,
                subscription.plan.name,
                days_remaining,
                subscription.end_date
            )
        except Exception as e:
            safe_log(f"Error sending expiration warning to {subscription.user.email}: {e}")
    
    # Expire subscriptions past their end_date
    expired_count = expire_all_subscriptions()
    
    # Get all expired subscriptions (not just today) per USER REQUEST
    all_expired = UserSubscription.query.filter_by(status='expired').all()
    
    # Send admin report
    try:
        send_admin_expiration_report(expiring_soon, all_expired)
    except Exception as e:
        safe_log(f"Error sending admin expiration report: {e}")
    
    safe_log(f"Subscription check complete: {len(expiring_soon)} expiring soon, {expired_count} expired")
    return {
        'expiring_soon': len(expiring_soon),
        'expired': expired_count
    }
