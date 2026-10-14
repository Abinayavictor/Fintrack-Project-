import React, { useState, useEffect, useCallback } from 'react';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  XCircle,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionCreatePayload,
  SubscriptionStatus,
  SubscriptionUpdatePayload,
} from '../types';
import { subscriptionsApi, extractErrorMessage } from '../services/api';
import { SubscriptionFormModal } from '../components/subscriptions/SubscriptionFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';
import {
  formatCurrency,
  formatDate,
  formatRelativeRenewal,
  getStatusBadgeStyle,
} from '../utils/formatters';

interface SubscriptionsPageProps {
  onDataMutated: () => void;
  isAddModalOpenFromHeader?: boolean;
  onCloseHeaderAddModal?: () => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
  onDataMutated,
  isAddModalOpenFromHeader = false,
  onCloseHeaderAddModal,
}) => {
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Destructive Action Dialog State
  const [dialogAction, setDialogAction] = useState<'cancel' | 'delete' | null>(null);
  const [targetSub, setTargetSub] = useState<Subscription | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAddModalOpenFromHeader) {
      setEditingSub(null);
      setIsFormModalOpen(true);
    }
  }, [isAddModalOpenFromHeader]);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionsApi.list(statusFilter || undefined);
      setSubscriptions(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleSaveSubscription = async (
    payload: SubscriptionCreatePayload | SubscriptionUpdatePayload
  ) => {
    if (editingSub) {
      await subscriptionsApi.update(editingSub.id, payload);
      showToast(`Updated "${payload.service_name || editingSub.service_name}"`, 'success');
    } else {
      await subscriptionsApi.create(payload as SubscriptionCreatePayload);
      showToast(`Added subscription "${payload.service_name}"`, 'success');
    }
    fetchSubscriptions();
    onDataMutated();
  };

  const handleTogglePause = async (sub: Subscription) => {
    const nextStatus: SubscriptionStatus = sub.status === 'active' ? 'paused' : 'active';
    try {
      await subscriptionsApi.update(sub.id, { status: nextStatus });
      showToast(
        nextStatus === 'paused'
          ? `Paused "${sub.service_name}" (excluded from burn rate)`
          : `Resumed "${sub.service_name}"`,
        'info'
      );
      fetchSubscriptions();
      onDataMutated();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleConfirmAction = async () => {
    if (!targetSub || !dialogAction) return;
    setIsProcessing(true);
    try {
      if (dialogAction === 'cancel') {
        await subscriptionsApi.update(targetSub.id, { status: 'cancelled' });
        showToast(`Cancelled "${targetSub.service_name}"`, 'info');
      } else if (dialogAction === 'delete') {
        await subscriptionsApi.delete(targetSub.id);
        showToast(`Deleted "${targetSub.service_name}"`, 'success');
      }
      setTargetSub(null);
      setDialogAction(null);
      fetchSubscriptions();
      onDataMutated();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate active monthly sum for summary badge
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const activeMonthlyBurn = activeSubs.reduce(
    (acc, curr) => acc + parseFloat(curr.normalized_monthly_cost),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Subscriptions ({subscriptions.length})
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            {formatCurrency(activeMonthlyBurn)}/mo active burn
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white capitalize"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>

          <button
            onClick={() => {
              setEditingSub(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Grid/List */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading subscriptions...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 text-sm">
          Failed to load subscriptions: {error}
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No Subscriptions Tracked"
          description={
            statusFilter
              ? `No subscriptions found with status "${statusFilter}".`
              : 'Add recurring software, utility, streaming, or membership subscriptions to track monthly burn rate.'
          }
          actionLabel="Add Subscription"
          onAction={() => {
            setEditingSub(null);
            setIsFormModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subscriptions.map((sub) => {
            const isImminent = sub.is_imminent;
            const badgeStyle = getStatusBadgeStyle(sub.status);
            const renewalInfo = formatRelativeRenewal(sub.days_until_renewal);

            return (
              <div
                key={sub.id}
                className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  isImminent
                    ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 shadow-amber-500/10'
                    : 'border-slate-200/80 dark:border-slate-800/80'
                }`}
              >
                <div>
                  {/* Card Header: Service name & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {sub.service_name}
                      </h4>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {sub.billing_cycle} billing
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  {/* Pricing presentation */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(sub.cost)}
                      </span>
                      <span className="text-xs text-slate-500">/{sub.billing_cycle}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Normalized:</span>
                      <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                        {formatCurrency(sub.normalized_monthly_cost)}/mo
                      </span>
                    </div>
                  </div>

                  {/* Renewal countdown and Imminent alert */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Next Renewal:
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {formatDate(sub.next_renewal_date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Countdown:
                      </span>
                      <span
                        className={`font-semibold ${
                          renewalInfo.isUrgent && sub.status === 'active'
                            ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {renewalInfo.isUrgent && sub.status === 'active' && (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        {renewalInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Auto-renewal:</span>
                      <span>{sub.auto_renew ? 'Automatic' : 'Manual / Off'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {sub.status !== 'cancelled' && (
                      <button
                        onClick={() => handleTogglePause(sub)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sub.status === 'paused'
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        title={sub.status === 'paused' ? 'Resume subscription' : 'Pause subscription'}
                      >
                        {sub.status === 'paused' ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingSub(sub);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit subscription"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {sub.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setTargetSub(sub);
                          setDialogAction('cancel');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Cancel subscription"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTargetSub(sub);
                        setDialogAction('delete');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Form Modal */}
      <SubscriptionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSub(null);
          if (onCloseHeaderAddModal) onCloseHeaderAddModal();
        }}
        onSubmit={handleSaveSubscription}
        initialData={editingSub}
      />

      {/* Confirmation Dialog for Cancel/Delete */}
      <ConfirmDialog
        isOpen={!!targetSub && !!dialogAction}
        onClose={() => {
          setTargetSub(null);
          setDialogAction(null);
        }}
        onConfirm={handleConfirmAction}
        title={dialogAction === 'cancel' ? 'Cancel Subscription' : 'Delete Subscription'}
        message={
          dialogAction === 'cancel'
            ? `Cancel "${targetSub?.service_name}"? It will remain archived but excluded from recurring burn rate and future forecast charges.`
            : `Permanently delete "${targetSub?.service_name}"? This record will be removed completely from the database.`
        }
        confirmLabel={dialogAction === 'cancel' ? 'Cancel Subscription' : 'Delete'}
        isDestructive={dialogAction === 'delete'}
        isLoading={isProcessing}
      />
    </div>
  );
};
