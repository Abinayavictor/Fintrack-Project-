import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  BillingCycle,
  Subscription,
  SubscriptionCreatePayload,
  SubscriptionStatus,
  SubscriptionUpdatePayload,
} from '../../types';

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SubscriptionCreatePayload | SubscriptionUpdatePayload) => Promise<void>;
  initialData?: Subscription | null;
  isLoading?: boolean;
}

export const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const [serviceName, setServiceName] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [autoRenew, setAutoRenew] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setServiceName(initialData.service_name);
        setCost(initialData.cost);
        setBillingCycle(initialData.billing_cycle);
        setNextRenewalDate(initialData.next_renewal_date);
        setStatus(initialData.status);
        setAutoRenew(initialData.auto_renew);
      } else {
        setServiceName('');
        setCost('');
        setBillingCycle('monthly');
        setNextRenewalDate('');
        setStatus('active');
        setAutoRenew(true);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = serviceName.trim();
    if (!cleanName) {
      setError('Service name is required.');
      return;
    }

    const numCost = parseFloat(cost);
    if (isNaN(numCost) || numCost <= 0) {
      setError('Cost must be a strictly positive number (> 0.00).');
      return;
    }

    try {
      const payload: SubscriptionCreatePayload = {
        service_name: cleanName,
        cost: numCost.toFixed(2),
        billing_cycle: billingCycle,
        next_renewal_date: nextRenewalDate || undefined,
        status,
        auto_renew: autoRenew,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subscription');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Subscription' : 'Add New Subscription'}
      description="Track recurring SaaS, utility, or membership commitments"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
            {error}
          </div>
        )}

        {/* Service Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Service Name *
          </label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="e.g. Netflix, Spotify, AWS"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Cost & Billing Cycle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cost ($ USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-sm text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Billing Cycle *
            </label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white capitalize"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        {/* Renewal Date & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Next Renewal Date
            </label>
            <input
              type="date"
              value={nextRenewalDate}
              onChange={(e) => setNextRenewalDate(e.target.value)}
              placeholder="Auto-calculated if omitted"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">Leave empty to auto-calculate</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lifecycle Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white capitalize"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Auto Renew Checkbox */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-700 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Auto-renews at end of billing cycle
            </span>
          </label>
          <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
            Non-renewing subscriptions will not project future recurring charges
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isEditing ? 'Update Subscription' : 'Create Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
