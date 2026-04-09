// Learning.jsx — Certifications and courses tracker with expiry/completion status

import { useState } from 'react';
import { useLearningData, CERT_STATUS_LABELS, COURSE_STATUS_LABELS,
         effectiveStatus, isExpiringSoon, isExpired } from '../hooks/useLearningData.js';
import { fmtDate } from '../data/sampleData.js';
import CertFormModal   from '../components/learning/CertFormModal.jsx';
import CourseFormModal  from '../components/learning/CourseFormModal.jsx';

export default function Learning() {
  const {
    certifications, courses,
    addCert, updateCert, removeCert,
    addCourse, updateCourse, removeCourse,
  } = useLearningData();

  const [modal, setModal] = useState(null); // { type: 'cert'|'course', mode: 'add'|'edit', data }

  /* ── Summary stats ── */
  const earnedCount   = certifications.filter(c => effectiveStatus(c) === 'earned').length;
  const expiringCount = certifications.filter(c => isExpiringSoon(c)).length;
  const completedCount = courses.filter(c => c.status === 'completed').length;
  const totalHours     = courses
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + (Number(c.hours) || 0), 0);

  /* ── Modal handlers ── */
  function openAddCert()       { setModal({ type: 'cert',   mode: 'add',  data: null }); }
  function openEditCert(cert)  { setModal({ type: 'cert',   mode: 'edit', data: cert }); }
  function openAddCourse()     { setModal({ type: 'course', mode: 'add',  data: null }); }
  function openEditCourse(c)   { setModal({ type: 'course', mode: 'edit', data: c }); }
  function closeModal()        { setModal(null); }

  function handleCertSave(form) {
    if (modal.mode === 'add') addCert(form);
    else updateCert(modal.data.id, form);
    closeModal();
  }

  function handleCourseSave(form) {
    if (modal.mode === 'add') addCourse(form);
    else updateCourse(modal.data.id, form);
    closeModal();
  }

  function handleDeleteCert(id) {
    if (confirm('Remove this certification?')) removeCert(id);
  }

  function handleDeleteCourse(id) {
    if (confirm('Remove this course?')) removeCourse(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Learning</h1>
        <div className="page-header-actions">
          <span className="page-count">
            {certifications.length} cert{certifications.length !== 1 ? 's' : ''},
            {' '}{courses.length} course{courses.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Certifications ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Certifications</h2>
          <div className="section-header-right">
            <span className="section-sub">
              {earnedCount} earned
              {expiringCount > 0 && (
                <span className="learning-expiring-badge"> · {expiringCount} expiring soon</span>
              )}
            </span>
            <button className="btn-primary" onClick={openAddCert}>+ Add certification</button>
          </div>
        </div>
        <div className="learning-list">
          {certifications.map(cert => (
            <CertCard key={cert.id} cert={cert}
              onEdit={() => openEditCert(cert)}
              onDelete={() => handleDeleteCert(cert.id)} />
          ))}
          {certifications.length === 0 && (
            <p className="list-empty">No certifications yet. Add one to start tracking credentials.</p>
          )}
        </div>
      </section>

      {/* ── Courses ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Courses</h2>
          <div className="section-header-right">
            <span className="section-sub">
              {completedCount} completed · {totalHours} hr{totalHours !== 1 ? 's' : ''} logged
            </span>
            <button className="btn-primary" onClick={openAddCourse}>+ Add course</button>
          </div>
        </div>
        <div className="learning-list">
          {courses.map(course => (
            <CourseCard key={course.id} course={course}
              onEdit={() => openEditCourse(course)}
              onDelete={() => handleDeleteCourse(course.id)} />
          ))}
          {courses.length === 0 && (
            <p className="list-empty">No courses yet. Add one to log your training.</p>
          )}
        </div>
      </section>

      {/* ── Modals ── */}
      {modal?.type === 'cert' && (
        <CertFormModal mode={modal.mode} initial={modal.data ?? {}}
          onSave={handleCertSave} onClose={closeModal} />
      )}
      {modal?.type === 'course' && (
        <CourseFormModal mode={modal.mode} initial={modal.data ?? {}}
          onSave={handleCourseSave} onClose={closeModal} />
      )}
    </div>
  );
}

/* ── Certification card ── */

function CertCard({ cert, onEdit, onDelete }) {
  const status = effectiveStatus(cert);
  const expiringSoon = isExpiringSoon(cert);
  const expired = isExpired(cert);

  return (
    <div className="learning-card">
      <div className="learning-card-header">
        <div className="learning-card-title-row">
          <h3 className="learning-card-name">{cert.name}</h3>
          <div className="learning-card-actions">
            <button className="row-btn" onClick={onEdit}>Edit</button>
            <button className="row-btn row-btn--danger" onClick={onDelete}>Remove</button>
          </div>
        </div>
        <div className="learning-card-meta">
          <span className="learning-card-issuer">{cert.issuer}</span>
          <span className={`status-badge status-badge--${status}`}>
            {CERT_STATUS_LABELS[status]}
          </span>
          {expiringSoon && (
            <span className="learning-expiry-warning">Expires soon</span>
          )}
          {expired && cert.status === 'earned' && (
            <span className="learning-expiry-expired">Expired</span>
          )}
        </div>
      </div>

      <div className="learning-card-body">
        {cert.dateEarned && (
          <span className="learning-card-detail">Earned {fmtDate(cert.dateEarned)}</span>
        )}
        {cert.expiryDate && (
          <span className="learning-card-detail">Expires {fmtDate(cert.expiryDate)}</span>
        )}
        {cert.credentialId && (
          <span className="learning-card-detail">ID: {cert.credentialId}</span>
        )}
        {cert.badgeUrl && (
          <a href={cert.badgeUrl} target="_blank" rel="noopener noreferrer"
            className="learning-badge-link">View badge</a>
        )}
      </div>

      {cert.notes && <p className="learning-card-notes">{cert.notes}</p>}
    </div>
  );
}

/* ── Course card ── */

function CourseCard({ course, onEdit, onDelete }) {
  return (
    <div className="learning-card">
      <div className="learning-card-header">
        <div className="learning-card-title-row">
          <h3 className="learning-card-name">{course.title}</h3>
          <div className="learning-card-actions">
            <button className="row-btn" onClick={onEdit}>Edit</button>
            <button className="row-btn row-btn--danger" onClick={onDelete}>Remove</button>
          </div>
        </div>
        <div className="learning-card-meta">
          {course.provider && <span className="learning-card-issuer">{course.provider}</span>}
          <span className={`status-badge status-badge--${course.status}`}>
            {COURSE_STATUS_LABELS[course.status]}
          </span>
        </div>
      </div>

      <div className="learning-card-body">
        {course.dateCompleted && (
          <span className="learning-card-detail">Completed {fmtDate(course.dateCompleted)}</span>
        )}
        {course.hours && (
          <span className="learning-card-detail">{course.hours} hr{Number(course.hours) !== 1 ? 's' : ''}</span>
        )}
      </div>

      {course.notes && <p className="learning-card-notes">{course.notes}</p>}
    </div>
  );
}
