import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface MailProps {
  studentEmail: string;
  mentorEmail: string;
  studentName: string;
  mentorName: string;
  date: string;
  time: string;
}

function studentTemplate({
  studentName,
  mentorName,
  date,
  time,
}: MailProps) {

  return `
  <div style="font-family:Arial;background:#f4f6fb;padding:40px">
    <div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:30px">
      <h2 style="color:#4F46E5;margin-bottom:0">Aura.ai</h2>
      <p style="color:#777;margin-top:4px">Mentorship Platform</p>
      <hr/>
      <h3>🎉 Session Confirmed</h3>
      <p>Hello <b>${studentName}</b>,</p>
      <p>Your mentorship session has been successfully booked.</p>
      <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-top:15px">
        <p><b>Mentor:</b> ${mentorName}</p>
        <p><b>Date:</b> ${date}</p>
        <p><b>Time:</b> ${time}</p>
      </div>
      <hr style="margin-top:30px"/>
      <p style="font-size:12px;color:#999">
        © ${new Date().getFullYear()} Aura.ai • All rights reserved
      </p>
    </div>
  </div>
  `;
}

function mentorTemplate({
  studentName,
  mentorName,
  date,
  time
}: MailProps) {

  return `
  <div style="font-family:Arial;background:#f4f6fb;padding:40px">
    <div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:30px">
      <h2 style="color:#4F46E5">Aura.ai</h2>
      <h3>📅 New Session Booked</h3>
      <p>Hello <b>${mentorName}</b>,</p>
      <p>A student has booked a mentorship session with you.</p>
      <div style="background:#f9fafb;padding:16px;border-radius:8px">
        <p><b>Student:</b> ${studentName}</p>
        <p><b>Date:</b> ${date}</p>
        <p><b>Time:</b> ${time}</p>
      </div>
      <hr style="margin-top:30px"/>
      <p style="font-size:12px;color:#999">
        © ${new Date().getFullYear()} Aura.ai
      </p>
    </div>
  </div>
  `;
}

export async function sendBookingMail({
  studentEmail,
  mentorEmail,
  studentName,
  mentorName,
  date,
  time
}: MailProps) {

  // STUDENT EMAIL
  await transporter.sendMail({
    from: `"Aura.ai" <${process.env.SMTP_USER}>`,
    to: studentEmail,
    subject: "🎉 Your Aura.ai Mentorship Session is Confirmed",
    html: studentTemplate({
      studentEmail,
      mentorEmail,
      studentName,
      mentorName,
      date,
      time
    })
  });

  // MENTOR EMAIL
  await transporter.sendMail({
    from: `"Aura.ai" <${process.env.SMTP_USER}>`,
    to: mentorEmail,
    subject: "📅 New Mentorship Session Booked",
    html: mentorTemplate({
      studentEmail,
      mentorEmail,
      studentName,
      mentorName,
      date,
      time
    })
  });
}