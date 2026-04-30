import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/api';

function CarIconLarge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
      strokeLinecap="round" strokeLinejoin="round" className="vehicle-empty-icon">
      <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l3-5h10l3 5h1a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      <circle cx="7.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="17" r="2.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete }) {
  return (
    <div className="vehicle-card">
      <div className="vc-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" className="vc-icon">
          <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l3-5h10l3 5h1a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
          <circle cx="7.5" cy="17" r="2.5" />
          <circle cx="16.5" cy="17" r="2.5" />
        </svg>
      </div>
      <div className="vc-info">
        <p className="vehicle-card-name">{vehicle.name}</p>
        <div className="vc-meta">
          <span className="vehicle-plate-badge">{vehicle.licensePlate}</span>
          <span className="vehicle-card-id">ID: {vehicle.vehicleId}</span>
        </div>
      </div>
      <div className="vc-actions">
        {onEdit && (
          <button className="vc-btn vc-btn-edit" onClick={onEdit} title="Edit">
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button className="vc-btn vc-btn-delete" onClick={onDelete} title="Delete">
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function VehicleModal({ title, form, setForm, error, saving, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="form-group">
            <label className="form-label">Vehicle Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Truck Alpha"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">License Plate</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. TN 01 AB 1234"
              value={form.licensePlate}
              onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ vehicle, saving, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-sm">
        <div className="modal-header">
          <h2>Delete Vehicle</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-content delete-modal-body">
          <div className="delete-warning-icon"><WarningIcon /></div>
          <p className="delete-modal-title">Delete <strong>{vehicle.name}</strong>?</p>
          <p className="delete-modal-sub">
            This will permanently remove <span className="vehicle-plate-badge">{vehicle.licensePlate}</span> and
            all its telemetry data. This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const { isAdmin, canEdit } = useAuth();
  const [vehicles, setVehicles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [addModal, setAddModal]       = useState(false);
  const [editModal, setEditModal]     = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const [form, setForm]           = useState({ name: '', licensePlate: '' });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      setLoading(true);
      setFetchError(null);
      const { data } = await getVehicles();
      setVehicles(data);
    } catch {
      setFetchError('Could not load vehicles. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm({ name: '', licensePlate: '' });
    setFormError('');
    setAddModal(true);
  }

  function openEdit(vehicle) {
    setForm({ name: vehicle.name, licensePlate: vehicle.licensePlate });
    setFormError('');
    setEditModal(vehicle);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.licensePlate.trim()) {
      setFormError('Both fields are required.');
      return;
    }
    setSaving(true);
    try {
      await createVehicle({ name: form.name.trim(), licensePlate: form.licensePlate.trim() });
      setAddModal(false);
      loadVehicles();
    } catch {
      setFormError('Failed to add vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!form.name.trim() || !form.licensePlate.trim()) {
      setFormError('Both fields are required.');
      return;
    }
    setSaving(true);
    try {
      await updateVehicle(editModal.vehicleId, { name: form.name.trim(), licensePlate: form.licensePlate.trim() });
      setEditModal(null);
      loadVehicles();
    } catch {
      setFormError('Failed to update vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteVehicle(deleteModal.vehicleId);
    } catch { /* best-effort */ }
    setDeleteModal(null);
    setSaving(false);
    loadVehicles();
  }

  return (
    <div className="vehicles-page">
      <div className="page-header">
        <div className="vehicles-header-row">
          <div>
            <h1>Vehicles</h1>
            <p>
              {loading
                ? 'Loading fleet…'
                : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          {canEdit() && (
            <button className="btn-add-vehicle" onClick={openAdd}>
              <span className="btn-add-plus">+</span> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading vehicles…</p>
        </div>
      )}

      {!loading && fetchError && (
        <div className="vehicles-error-banner">
          <span>{fetchError}</span>
          <button className="btn-secondary" onClick={loadVehicles}>Retry</button>
        </div>
      )}

      {!loading && !fetchError && vehicles.length === 0 && (
        <div className="vehicles-empty">
          <CarIconLarge />
          <p className="vehicles-empty-title">No vehicles registered yet</p>
          <p className="vehicles-empty-sub">Add your first vehicle to start tracking telemetry.</p>
          <button className="btn-primary" onClick={openAdd}>Add Vehicle</button>
        </div>
      )}

      {!loading && !fetchError && vehicles.length > 0 && (
        <div className="vehicles-grid">
          {vehicles.map(v => (
            <VehicleCard
              key={v.vehicleId}
              vehicle={v}
              onEdit={canEdit() ? () => openEdit(v) : null}
              onDelete={isAdmin() ? () => setDeleteModal(v) : null}
            />
          ))}
        </div>
      )}

      {addModal && (
        <VehicleModal
          title="Add Vehicle"
          form={form}
          setForm={setForm}
          error={formError}
          saving={saving}
          onSave={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {editModal && (
        <VehicleModal
          title="Edit Vehicle"
          form={form}
          setForm={setForm}
          error={formError}
          saving={saving}
          onSave={handleEdit}
          onClose={() => setEditModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteModal
          vehicle={deleteModal}
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
