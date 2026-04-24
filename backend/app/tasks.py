from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from pytz import timezone
import json
import uuid
import time
import os
import logging
from .extensions import db
from .models import Collaboration, CollaborationStatus, Solution, User, Announcement
from .utils import send_email
from flask import current_app
from sqlalchemy import or_  , and_ 

IST = timezone("Asia/Kolkata")
EMAIL_SEND_DELAY = 5

def check_collaboration_status():
    """
    Cron job to check for expired collaborations and update their status to stopped.
    """
    try:
        now = datetime.now(IST)
        expired_collaborations = Collaboration.query.filter(
            Collaboration.status == CollaborationStatus.active,
            or_(
                and_(
                    Collaboration.extended_end_date.isnot(None),
                    Collaboration.extended_end_date < now
                ),
                and_(
                    Collaboration.extended_end_date.is_(None),
                    Collaboration.end_date.isnot(None),
                    Collaboration.end_date < now
                )
            )
        ).all()

        count = 0
        if expired_collaborations:
            for collab in expired_collaborations:
                collab.status = CollaborationStatus.expired
                count += 1
            
            db.session.commit()
            current_app.logger.info(f"Cron Job: Updated {count} expired collaborations to stopped.")
        else:
            current_app.logger.info("Cron Job: No expired collaborations found.")

        admin_users = User.query.filter_by(role='admin').all()
        admin_emails = [admin.email for admin in admin_users if admin.email]
        if admin_emails:
            report_content = f"""
            <h2 style="color: #2563eb;">Collaboration Status Update Report</h2>
            <p><strong>Date:</strong> {datetime.now(IST).strftime('%B %d, %Y')}</p>
            <p><strong>Processed:</strong> {len(expired_collaborations)} collaborations found past end date.</p>
            <p><strong>Updated:</strong> {count} collaborations marked as 'stopped'.</p>
            """
            if expired_collaborations:
                report_content += "<ul>"
                for c in expired_collaborations:
                    report_content += f"<li>{c.title} (ID: {c.id})</li>"
                report_content += "</ul>"
                
            send_email(
                subject=f"Daily Collaboration Status Report - {datetime.now(IST).strftime('%Y-%m-%d')}",
                recipients=admin_emails,
                html_body=create_email_template(report_content),
                sender=('Hustloop System', current_app.config['MAIL_USERNAME'])
            )
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Cron Job Error: Failed to update expired collaborations: {e}")
    finally:
        db.session.remove()

def create_announcement(collab_id, title, message):
    """Helper function to create announcements"""
    try:
        announcement = Announcement(
            user_id=str(uuid.uuid4()),
            created_by="System",
            collaboration_id=collab_id,
            title=title,
            message=message,
            type="deadline",
            attachments=json.dumps([])
        )
        db.session.add(announcement)
        db.session.commit()
        return True
    except Exception as e:
        current_app.logger.error(f"timeline_check: Failed to create announcement: {str(e)}")
        return False

def create_email_template(content):
    """Create professional email template with header and footer"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:30px 20px; text-align:center;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE', 'https://hustloop.com/logo.png')}" alt="Hustloop" style="max-height:50px; width:auto;">
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding:40px 30px; color:#333333; line-height:1.6;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#f8f9fa; padding:30px; text-align:center; border-top:1px solid #e9ecef;">
                                <p style="margin:0 0 15px 0; color:#6c757d; font-size:14px;">Connect with us</p>
                                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                                    <tr>
                                        <td style="padding:0 10px;">
                                            <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                                <img src="{os.getenv("X_ICON")}" alt="X" 
                                                    style="width:24px; height:24px; vertical-align:middle;">
                                            </a>
                                        </td>
                                        <td style="padding:0 10px;">
                                            <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                                <img src="{os.getenv("LINKEDIN_ICON")}" alt="LinkedIn" style="width:24px; height:24px;">
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin:20px 0 5px 0; color:#6c757d; font-size:12px;">
                                    © 2025 Hustloop. All rights reserved.
                                </p>
                                <p style="margin:0; color:#6c757d; font-size:12px;">
                                    <a href="https://hustloop.com" style="color:#667eea; text-decoration:none;">Visit our website</a> | 
                                    <a href="mailto:support@hustloop.com" style="color:#667eea; text-decoration:none;">Contact Support</a>
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

def send_timeline_emails(subject, participant_user, collab_owner_id, challenge_title, event_description):
    """Send email to participant only (owner and admins will receive batched emails)"""
    emails_sent = 0
    
    # Email to participant
    participant_content = f"""
    <p style="font-size:16px; margin-bottom:20px;">Hello <strong>{participant_user.name}</strong>,</p>
    <p style="font-size:14px; margin-bottom:15px;">
        We would like to inform you about the <strong>{event_description}</strong> for the challenge <strong>"{challenge_title}"</strong>.
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        Please ensure you complete any pending actions before the deadline.
    </p>
    <p style="font-size:14px; margin-top:30px; color:#6c757d;">
        Best regards,<br>
        <strong>The Hustloop Team</strong>
    </p>
    """
    send_email(
        subject=subject,
        recipients=[participant_user.email],
        html_body=create_email_template(participant_content),
        sender=('Hustloop', current_app.config['MAIL_USERNAME'])
    )
    time.sleep(EMAIL_SEND_DELAY)
    emails_sent += 1
    
    return emails_sent

def send_batch_owner_timeline_email(subject, challenge_title, event_description, participants_data, owner_info):
    """Send ONE batched email to owner with table of all joined participants"""
    if not participants_data or not owner_info.get('email'):
        return 0
    
    # Build HTML table of participants
    participants_table = """
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <thead>
            <tr style="background-color:#4a90e2; color:white;">
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Participant Name</th>
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Email</th>
            </tr>
        </thead>
        <tbody>
    """
    
    for participant in participants_data:
        participants_table += f"""
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">{participant['name']}</td>
                <td style="padding:10px; border:1px solid #ddd;">{participant['email']}</td>
            </tr>
        """
    
    participants_table += """
        </tbody>
    </table>
    """
    
    # Create owner email content
    participant_count = len(participants_data)
    owner_content = f"""
    <p style="font-size:16px; margin-bottom:20px;">Hello <strong>{owner_info['name']}</strong>,</p>
    <p style="font-size:14px; margin-bottom:15px;">
        We have an update regarding your challenge <strong>"{challenge_title}"</strong>.
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        <strong>Event:</strong> {event_description.capitalize()}
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        <strong>{participant_count} participant(s)</strong> are joined by this event:
    </p>
    <p style="font-size:14px; margin-top:30px; color:#6c757d;">
        Best regards,<br>
        <strong>The Hustloop Team</strong>
    </p>
    """
    
    send_email(
        subject=f"[Challenge Owner] {subject}",
        recipients=[owner_info['email']],
        html_body=create_email_template(owner_content),
        sender=('Hustloop', current_app.config['MAIL_USERNAME'])
    )
    time.sleep(EMAIL_SEND_DELAY)
    
    return 1

def send_batch_admin_timeline_email(subject, challenge_title, event_description, participants_data, owner_info):
    """Send ONE batched email to admins with table of all joined participants"""
    if not participants_data:
        return 0
    
    # Build HTML table of participants
    participants_table = """
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <thead>
            <tr style="background-color:#4a90e2; color:white;">
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Participant Name</th>
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Email</th>
            </tr>
        </thead>
        <tbody>
    """
    
    for participant in participants_data:
        participants_table += f"""
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">{participant['name']}</td>
                <td style="padding:10px; border:1px solid #ddd;">{participant['email']}</td>
            </tr>
        """
    
    participants_table += """
        </tbody>
    </table>
    """
    
    # Get admin emails
    admin_users = User.query.filter_by(role='admin').all()
    admin_emails = [admin.email for admin in admin_users if admin.email]
    
    if not admin_emails:
        return 0
    
    # Create admin email content
    participant_count = len(participants_data)
    admin_content = f"""
    <p style="font-size:16px; margin-bottom:20px;">Hello <strong>Admin</strong>,</p>
    <p style="font-size:14px; margin-bottom:15px;">
        Timeline notification for challenge <strong>"{challenge_title}"</strong>:
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        <strong>Event:</strong> {event_description.capitalize()}
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        <strong>{participant_count} participant(s)</strong> are joined by this event:
    </p>
    {participants_table}
    <div style="background-color:#f8f9fa; padding:15px; border-radius:5px; margin:20px 0;">
        <p style="font-size:13px; margin:5px 0;"><strong>Challenge Owner:</strong> {owner_info['name']} ({owner_info['email']})</p>
    </div>
    <p style="font-size:14px; margin-top:30px; color:#6c757d;">
        Best regards,<br>
        <strong>Hustloop System</strong>
    </p>
    """
    
    send_email(
        subject=f"[Admin] {subject}",
        recipients=admin_emails,
        html_body=create_email_template(admin_content),
        sender=('Hustloop', current_app.config['MAIL_USERNAME'])
    )
    time.sleep(EMAIL_SEND_DELAY)
    
    return len(admin_emails)

def send_participant_email(subject, participant_user, challenge_title, event_description):
    """Send email to participant only"""
    participant_content = f"""
    <p style="font-size:16px; margin-bottom:20px;">Hello <strong>{participant_user.name}</strong>,</p>
    <p style="font-size:14px; margin-bottom:15px;">
        We wanted to inform you that the <strong>{event_description}</strong> for the challenge <strong>"{challenge_title}"</strong>.
    </p>
    <p style="font-size:14px; margin-bottom:15px;">
        Please ensure you complete any pending actions before the deadline.
    </p>
    <p style="font-size:14px; margin-top:30px; color:#6c757d;">
        Best regards,<br>
        <strong>The Hustloop Team</strong>
    </p>
    """
    send_email(
        subject=subject,
        recipients=[participant_user.email],
        html_body=create_email_template(participant_content),
        sender=('Hustloop', current_app.config['MAIL_USERNAME'])
    )
    time.sleep(EMAIL_SEND_DELAY)
    return 1

def send_owner_and_admin_emails(subject, collab_owner_id, challenge_title, event_description, accepted_solutions):
    """Send emails to collaboration owner and admins with participant details table"""
    emails_sent = 0
    accepted_count = len(accepted_solutions)
    
    # Build HTML table of accepted participants
    participants_table = """
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <thead>
            <tr style="background-color:#4a90e2; color:white;">
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Contact Name</th>
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Email</th>
                <th style="padding:10px; border:1px solid #ddd; text-align:left;">Mobile Number</th>
            </tr>
        </thead>
        <tbody>
    """
    
    for solution in accepted_solutions:
        user = db.session.get(User, solution.user_id)
        user_email = user.email if user else 'N/A'
        participants_table += f"""
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">{solution.contact_name}</td>
                <td style="padding:10px; border:1px solid #ddd;">{user_email}</td>
                <td style="padding:10px; border:1px solid #ddd;">{solution.mobile_number}</td>
            </tr>
        """
    
    participants_table += """
        </tbody>
    </table>
    """
    
    # Email to collaboration owner
    owner = db.session.get(User, collab_owner_id)
    if owner and owner.email:
        owner_content = f"""
        <p style="font-size:16px; margin-bottom:20px;">Hello <strong>{owner.name}</strong>,</p>
        <p style="font-size:14px; margin-bottom:15px;">
            We have an update regarding your challenge <strong>"{challenge_title}"</strong>.
        </p>
        <p style="font-size:14px; margin-bottom:15px;">
            <strong>Event:</strong> {event_description.capitalize()}
        </p>
        <p style="font-size:14px; margin-bottom:15px;">
            <strong>{accepted_count} accepted solution(s)</strong> are joined by this event:
        </p>
        {participants_table}
        <p style="font-size:14px; margin-top:30px; color:#6c757d;">
            Best regards,<br>
            <strong>The Hustloop Team</strong>
        </p>
        """
        send_email(
            subject=subject,
            recipients=[owner.email],
            html_body=create_email_template(owner_content),
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )
        time.sleep(EMAIL_SEND_DELAY)
        emails_sent += 1
    
    # Email to all admins
    admin_users = User.query.filter_by(role='admin').all()
    admin_emails = [admin.email for admin in admin_users if admin.email and admin.email != (owner.email if owner else None)]
    
    if admin_emails:
        admin_content = f"""
        <p style="font-size:16px; margin-bottom:20px;">Hello <strong>Admin</strong>,</p>
        <p style="font-size:14px; margin-bottom:15px;">
            Timeline notification for challenge <strong>"{challenge_title}"</strong>:
        </p>
        <p style="font-size:14px; margin-bottom:15px;">
            <strong>Event:</strong> {event_description.capitalize()}
        </p>
        <p style="font-size:14px; margin-bottom:15px;">
            <strong>{accepted_count} accepted solution(s)</strong> are joined by this event:
        </p>
        {participants_table}
        <div style="background-color:#f8f9fa; padding:15px; border-radius:5px; margin:20px 0;">
            <p style="font-size:13px; margin:5px 0;"><strong>Owner:</strong> {owner.name if owner else 'N/A'} ({owner.email if owner else 'N/A'})</p>
        </div>
        <p style="font-size:14px; margin-top:30px; color:#6c757d;">
            Best regards,<br>
            <strong>Hustloop System</strong>
        </p>
        """
        send_email(
            subject=f"[Admin] {subject}",
            recipients=admin_emails,
            html_body=create_email_template(admin_content),
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )
        time.sleep(EMAIL_SEND_DELAY)
        emails_sent += len(admin_emails)
    
    return emails_sent

def check_collaboration_timelines():
    """
    Cron job to check for collaboration timeline events and send notifications.
    Merged from check_timeline.py
    """
    try:
        current_app.logger.info("timeline_check: Started")
        now = datetime.now(IST)
        today = now.date()
        
        collaborations = Collaboration.query.all()
        total_emails_sent = 0
        total_announcements_created = 0
        
        for c in collaborations:
            try:
                # ... date calculations ...
                application_ended = c.end_date
                extended_end_date = c.extended_end_date

                if extended_end_date:
                    review_started = extended_end_date + timedelta(days=1)
                else:
                    review_started = application_ended + timedelta(days=1)
                
                review_ended = review_started + relativedelta(months=1)

                if c.solutions and len(c.solutions) > 20:
                    review_ended = review_ended + timedelta(days=15)

                screening_started = review_ended + timedelta(days=1)
                screening_ended = screening_started + relativedelta(months=1)

                pitching_started = screening_ended + timedelta(days=1)
                pitching_ended = pitching_started + relativedelta(months=1)

                stage1 = application_ended
                stage2 = extended_end_date if extended_end_date else None

                solutions = Solution.query.filter_by(challenge_id=c.id).all()
                
                # Track screening events and store accepted solutions
                screening_start_accepted_solutions = []
                screening_end_accepted_solutions = []
                
                # Track participants for timeline events (for batched admin emails)
                application_end_participants = []
                extended_participants = []
                review_start_participants = []
                review_end_participants = []
                pitching_start_participants = []
                pitching_end_participants = []
                
                # Track which announcements have been created for this collaboration
                announcements_created = {
                    'application_end': False,
                    'extended': False,
                    'review_start': False,
                    'review_end': False
                }
                
                for s in solutions:
                    try:
                        user = db.session.get(User, s.user_id)
                        if not user or not user.email:
                            logging.warning(f"timeline_check: No user/email for solution {s.id}")
                            continue

                        if stage1 and today == (stage1 - timedelta(days=1)).date() and not s.application_end_email_sent:
                            if not announcements_created['application_end']:
                                if create_announcement(
                                    c.id,
                                    "Challenge Closing Soon",
                                    f"The challenge '{c.title}' will close tomorrow. Please submit your solutions before the deadline."
                                ):
                                    total_announcements_created += 1
                                    announcements_created['application_end'] = True
                            
                            emails_count = send_timeline_emails(
                                subject="Challenge Closes Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Challenge closes tomorrow"
                            )
                            application_end_participants.append({'name': user.name, 'email': user.email})
                            s.application_end_email_sent = True
                            total_emails_sent += emails_count

                        if stage2 and stage2 != stage1 and today == (stage2 - timedelta(days=1)).date() and not s.extended_email_sent:
                            if not announcements_created['extended']:
                                if create_announcement(
                                    c.id,
                                    "Extended Deadline Tomorrow",
                                    f"The extended deadline for challenge '{c.title}' is tomorrow. Please ensure all submissions are completed."
                                ):
                                    total_announcements_created += 1
                                    announcements_created['extended'] = True
                            
                            emails_count = send_timeline_emails(
                                subject="Extended Deadline Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Extended deadline is tomorrow"
                            )
                            extended_participants.append({'name': user.name, 'email': user.email})
                            s.extended_email_sent = True
                            total_emails_sent += emails_count

                        if review_started and today == (review_started - timedelta(days=1)).date() and not s.review_start_email_sent:
                            if not announcements_created['review_start']:
                                if create_announcement(
                                    c.id,
                                    "Review Phase Starting",
                                    f"The review phase for challenge '{c.title}' will begin tomorrow."
                                ):
                                    total_announcements_created += 1
                                    announcements_created['review_start'] = True
                            
                            emails_count = send_timeline_emails(
                                subject="Review Starts Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Review phase starts tomorrow"
                            )
                            review_start_participants.append({'name': user.name, 'email': user.email})
                            s.review_start_email_sent = True
                            total_emails_sent += emails_count

                        if review_ended and today == (review_ended - timedelta(days=1)).date() and not s.review_end_email_sent:
                            if not announcements_created['review_end']:
                                if create_announcement(
                                    c.id,
                                    "Review Phase Ending",
                                    f"The review phase for challenge '{c.title}' will end tomorrow."
                                ):
                                    total_announcements_created += 1
                                    announcements_created['review_end'] = True
                            
                            emails_count = send_timeline_emails(
                                subject="Review Ends Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Review phase ends tomorrow"
                            )
                            review_end_participants.append({'name': user.name, 'email': user.email})
                            s.review_end_email_sent = True
                            total_emails_sent += emails_count

                        if screening_started and today == (screening_started - timedelta(days=1)).date() and not s.screening_start_email_sent:
                            if s.status == "solution_accepted_points":
                                screening_start_accepted_solutions.append(s)
                                emails_count = send_participant_email(
                                    subject="Screening Starts Tomorrow",
                                    participant_user=user,
                                    challenge_title=c.title or c.id,
                                    event_description="Screening phase starts tomorrow"
                                )
                                total_emails_sent += emails_count
                            s.screening_start_email_sent = True

                        if screening_ended and today == (screening_ended - timedelta(days=1)).date() and not s.screening_end_email_sent:
                            if s.status == "solution_accepted_points":
                                screening_end_accepted_solutions.append(s)
                                emails_count = send_participant_email(
                                    subject="Screening Ends Tomorrow",
                                    participant_user=user,
                                    challenge_title=c.title or c.id,
                                    event_description="Screening phase ends tomorrow"
                                )
                                total_emails_sent += emails_count
                            s.screening_end_email_sent = True

                        if pitching_started and today == (pitching_started - timedelta(days=1)).date() and not s.pitching_start_email_sent:
                            emails_count = send_timeline_emails(
                                subject="Pitching Starts Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Pitching phase starts tomorrow"
                            )
                            pitching_start_participants.append({'name': user.name, 'email': user.email})
                            s.pitching_start_email_sent = True
                            total_emails_sent += emails_count

                        if pitching_ended and today == (pitching_ended - timedelta(days=1)).date() and not s.pitching_end_email_sent:
                            emails_count = send_timeline_emails(
                                subject="Pitching Ends Tomorrow",
                                participant_user=user,
                                collab_owner_id=c.user_id,
                                challenge_title=c.title or c.id,
                                event_description="Pitching phase ends tomorrow"
                            )
                            pitching_end_participants.append({'name': user.name, 'email': user.email})
                            s.pitching_end_email_sent = True
                            total_emails_sent += emails_count
                    
                    except Exception as e:
                        logging.error(f"timeline_check_error: Failed to process solution {s.id}: {str(e)}")
                        continue
                
                db.session.commit()
                
                owner = db.session.get(User, c.user_id)
                owner_info = {'name': owner.name if owner else 'N/A', 'email': owner.email if owner else None}
                
                if application_end_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Challenge Closes Tomorrow", c.title or c.id, "Challenge closes tomorrow", application_end_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Challenge Closes Tomorrow", c.title or c.id, "Challenge closes tomorrow", application_end_participants, owner_info)
                
                if extended_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Extended Deadline Tomorrow", c.title or c.id, "Extended deadline is tomorrow", extended_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Extended Deadline Tomorrow", c.title or c.id, "Extended deadline is tomorrow", extended_participants, owner_info)
                
                if review_start_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Review Starts Tomorrow", c.title or c.id, "Review phase starts tomorrow", review_start_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Review Starts Tomorrow", c.title or c.id, "Review phase starts tomorrow", review_start_participants, owner_info)
                
                if review_end_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Review Ends Tomorrow", c.title or c.id, "Review phase ends tomorrow", review_end_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Review Ends Tomorrow", c.title or c.id, "Review phase ends tomorrow", review_end_participants, owner_info)
                
                if pitching_start_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Pitching Starts Tomorrow", c.title or c.id, "Pitching phase starts tomorrow", pitching_start_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Pitching Starts Tomorrow", c.title or c.id, "Pitching phase starts tomorrow", pitching_start_participants, owner_info)
                
                if pitching_end_participants:
                    total_emails_sent += send_batch_owner_timeline_email("Pitching Ends Tomorrow", c.title or c.id, "Pitching phase ends tomorrow", pitching_end_participants, owner_info)
                    total_emails_sent += send_batch_admin_timeline_email("Pitching Ends Tomorrow", c.title or c.id, "Pitching phase ends tomorrow", pitching_end_participants, owner_info)
                
                if len(screening_start_accepted_solutions) > 0:
                    total_emails_sent += send_owner_and_admin_emails("Screening Starts Tomorrow", c.user_id, c.title or c.id, "Screening phase starts tomorrow", screening_start_accepted_solutions)
                    if create_announcement(c.id, "Screening Phase Starting", f"The screening phase for challenge '{c.title}' will begin tomorrow."):
                        total_announcements_created += 1
                
                if len(screening_end_accepted_solutions) > 0:
                    total_emails_sent += send_owner_and_admin_emails("Screening Ends Tomorrow", c.user_id, c.title or c.id, "Screening phase ends tomorrow", screening_end_accepted_solutions)
                    if create_announcement(c.id, "Screening Phase Ending", f"The screening phase for challenge '{c.title}' will end tomorrow."):
                        total_announcements_created += 1
            
            except Exception as e:
                current_app.logger.error(f"timeline_check_error: Failed to process collaboration {c.id}: {str(e)}")
                continue
        
        current_app.logger.info(f"timeline_check_completed: Sent {total_emails_sent} emails and created {total_announcements_created} announcements")
        
    except Exception as e:
        current_app.logger.error(f"timeline_check_critical_error: {str(e)}")
        # Notify admins on critical failure with a detailed error report
        try:
            admin_users = User.query.filter_by(role='admin').all()
            admin_emails = [admin.email for admin in admin_users if admin.email]
            if admin_emails:
                error_html = f"""
                <h2 style="color: #dc2626;">🚨 Timeline Check Critical Failure</h2>
                <p>The daily collaboration timeline check failed with the following error:</p>
                <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; border: 1px solid #fecaca; font-family: monospace;">
                    {str(e)}
                </div>
                <p>Please check the server logs for more details.</p>
                """
                send_email(
                    subject="🚨 Timeline Check Failed - Immediate Action Required",
                    recipients=admin_emails,
                    html_body=create_email_template(error_html),
                    sender=('Hustloop System', current_app.config['MAIL_USERNAME'])
                )
        except Exception as log_e:
            current_app.logger.error(f"Failed to send critical failure email: {str(log_e)}")
    finally:
        db.session.remove()
