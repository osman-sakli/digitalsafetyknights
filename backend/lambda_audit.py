import json
import boto3
from datetime import datetime

ses = boto3.client('ses', region_name='us-east-1')

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': 'https://digitalsafetyknights.org',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        score = body.get('score', 0)
        grade = body.get('grade', '')
        message = body.get('message', '')
        recommendations = body.get('recommendations', [])

        if not email or '@' not in email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Valid email required.'})
            }

        # Build recommendations HTML
        rec_html = ''
        if recommendations:
            for rec in recommendations:
                rec_html += '<li style="padding:10px 0;border-bottom:1px solid #eee;color:#333;line-height:1.5;">⚠️ ' + rec + '</li>'
        else:
            rec_html = '<li style="padding:10px 0;color:#2a9d8f;">🎉 Perfect score! No recommendations needed.</li>'

        # Determine grade color
        if score >= 80:
            grade_color = '#2a9d8f'
            grade_bg = '#d4edda'
        elif score >= 60:
            grade_color = '#856404'
            grade_bg = '#fff3cd'
        elif score >= 40:
            grade_color = '#f4a261'
            grade_bg = '#fff3cd'
        else:
            grade_color = '#721c24'
            grade_bg = '#f8d7da'

        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '🛡️ Your DSK Family Safety Audit Report'},
                'Body': {
                    'Html': {'Data': f'''
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                      <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                        <h1 style="color:#c9a84c;margin:0;font-size:1.8rem;">⚔️ Digital Safety Knights</h1>
                        <p style="color:#8899bb;margin:8px 0 0;font-size:0.85rem;">Your Family Safety Audit Report</p>
                      </div>

                      <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">

                        <div style="text-align:center;padding:30px;background:#f4f6fb;border-radius:14px;margin-bottom:25px;">
                          <div style="font-size:4rem;font-weight:900;color:#0d1b3e;line-height:1;">{score}<span style="font-size:1.5rem;color:#999;">%</span></div>
                          <div style="display:inline-block;margin-top:15px;padding:8px 18px;border-radius:20px;font-weight:800;font-size:0.85rem;background:{grade_bg};color:{grade_color};">{grade}</div>
                          <p style="margin-top:15px;color:#555;font-size:0.95rem;line-height:1.6;">{message}</p>
                        </div>

                        <h2 style="color:#0d1b3e;font-size:1.2rem;border-bottom:3px solid #c9a84c;padding-bottom:8px;margin-bottom:15px;">📋 Recommended Next Steps</h2>
                        <ul style="list-style:none;padding:0;margin:0;">
                          {rec_html}
                        </ul>

                        <div style="background:#f4f6fb;border-radius:12px;padding:20px;margin-top:25px;">
                          <h3 style="color:#0d1b3e;margin:0 0 10px;font-size:1rem;">📚 Free Resources to Help</h3>
                          <ul style="color:#555;line-height:1.9;margin:0;padding-left:20px;font-size:0.9rem;">
                            <li><a href="https://digitalsafetyknights.org#guides" style="color:#c9a84c;text-decoration:none;font-weight:700;">Download all 6 Family Safety Guides</a></li>
                            <li><a href="https://digitalsafetyknights.org#journal" style="color:#c9a84c;text-decoration:none;font-weight:700;">Read DSK Monthly Journal</a></li>
                            <li><a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;text-decoration:none;font-weight:700;">Join our Discord Community</a></li>
                            <li><a href="https://digitalsafetyknights.org#emergency" style="color:#c9a84c;text-decoration:none;font-weight:700;">Emergency contacts</a></li>
                          </ul>
                        </div>

                        <div style="text-align:center;margin-top:25px;">
                          <a href="https://digitalsafetyknights.org/audit.html"
                             style="background:#c9a84c;color:#0d1b3e;padding:14px 32px;
                                    border-radius:25px;text-decoration:none;font-weight:900;
                                    display:inline-block;">
                            Retake Audit →
                          </a>
                        </div>

                        <p style="color:#aaa;font-size:0.78rem;margin-top:25px;text-align:center;line-height:1.6;">
                          © 2026 Digital Safety Knights · Global Digital Child Safety Organization<br>
                          digitalsafetyknights.org
                        </p>
                      </div>
                    </div>
                    '''}
                }
            }
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Report sent! Check your email.'})
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Could not send email.'})
        }
