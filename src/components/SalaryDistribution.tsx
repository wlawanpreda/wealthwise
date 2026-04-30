import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRightLeft, 
  Wallet, 
  History as HistoryIcon,
  CheckSquare, 
  Square,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Banknote,
  Search,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Briefcase,
  Undo2,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CSRCategory } from '../types';

// Portal component for the dropdown menu
const PickerPortal = ({ 
  children, 
  isOpen, 
  anchorRef, 
  onClose 
}: { 
  children: React.ReactNode; 
  isOpen: boolean; 
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const updateCoords = () => {
      if (isOpen && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const newCoords = {
          top: rect.bottom,
          left: rect.left,
          width: Math.max(rect.width, 256)
        };
        
        setCoords(prev => {
          if (!prev || 
              prev.top !== newCoords.top || 
              prev.left !== newCoords.left || 
              prev.width !== newCoords.width) {
            return newCoords;
          }
          return prev;
        });
      }
    };

    if (isOpen) {
      updateCoords();
      // Use requestAnimationFrame for smoother and safer updates than polling alone
      let rafId: number;
      const poll = () => {
        updateCoords();
        rafId = requestAnimationFrame(poll);
      };
      
      rafId = requestAnimationFrame(poll);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    } else {
      setCoords(null);
    }
  }, [isOpen, anchorRef]);

  if (!isOpen || !coords) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto bg-black/0" onClick={onClose} />
      <div 
        className="fixed pointer-events-auto"
        style={{ 
          top: coords.top + 8, 
          left: coords.left, 
          width: coords.width,
          maxWidth: 'calc(100vw - 32px)'
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// Custom Account Picker Component for a more visual mapping experience
function AccountPicker({ 
  value, 
  onChange, 
  accounts, 
  disabled,
  onOpenChange
}: { 
  value: string; 
  onChange: (id: string) => void; 
  accounts: any[]; 
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedAccount = accounts.find(a => a.id === value);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'Savings': return <PiggyBank size={16} />;
      case 'Investment': return <TrendingUp size={16} />;
      case 'Fixed': return <CreditCard size={16} />;
      case 'Checking': return <Briefcase size={16} />;
      default: return <Banknote size={16} />;
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(search.toLowerCase()) || 
      (acc.purpose && acc.purpose.toLowerCase().includes(search.toLowerCase()))
    );
  }, [accounts, search]);

  useEffect(() => {
    onOpenChange?.(isOpen);
    if (!isOpen) setSearch('');
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative w-full md:w-48" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full h-10 px-3 flex items-center justify-between rounded-xl border transition-all duration-300 text-left cursor-pointer",
          isOpen 
            ? "border-blue-600 ring-2 ring-blue-500/10 bg-white" 
            : "border-brand-border bg-brand-bg hover:bg-white hover:border-blue-300",
          disabled && "opacity-50 cursor-not-allowed grayscale"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center shrink-0",
            selectedAccount ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"
          )}>
            {selectedAccount ? getAccountIcon(selectedAccount.type) : <Banknote size={12} />}
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider truncate",
            selectedAccount ? "text-brand-text" : "text-brand-muted"
          )}>
            {selectedAccount ? selectedAccount.name : "Select Account..."}
          </span>
        </div>
        <ChevronDown size={14} className={cn("text-brand-secondary transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <PickerPortal isOpen={isOpen} anchorRef={containerRef} onClose={() => setIsOpen(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-brand-border shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-3 border-b border-brand-border bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input 
                autoFocus
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts..."
                className="w-full bg-white border border-brand-border rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredAccounts.length === 0 && (
              <div className="p-10 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <Search size={20} />
                </div>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">No accounts found</p>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                <X size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-widest">Unmap Account</span>
              </div>
            </button>
            
            <div className="h-px bg-brand-border/30 my-1 mx-2" />
            
            {filteredAccounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(acc.id); setIsOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                  value === acc.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  value === acc.id ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600 group-hover:scale-110"
                )}>
                  {getAccountIcon(acc.type)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">{acc.name}</span>
                  {acc.purpose && (
                    <span className="text-[8px] font-bold text-brand-secondary uppercase tracking-widest truncate opacity-70">
                      {acc.purpose}
                    </span>
                  )}
                </div>
                {value === acc.id && (
                  <div className="ml-auto">
                    <Check size={14} className="text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </PickerPortal>
    </div>
  );
}

export default function SalaryDistribution() {
  const { income, allocations, setAllocations, accounts } = useFinancial();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [undoTransfer, setUndoTransfer] = useState<{ id: string; originalTransferred: boolean; timestamp: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mappingConfirm, setMappingConfirm] = useState<{ allocId: string; accountId: string } | null>(null);

  useEffect(() => {
    if (undoTransfer) {
      const timer = setTimeout(() => {
        setUndoTransfer(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [undoTransfer]);

  const handleUndo = () => {
    if (!undoTransfer) return;
    
    setAllocations(prev => prev.map(a => {
      if (a.id === undoTransfer.id) {
        // Remove the latest history entry and revert status
        const newHistory = [...(a.transferHistory || [])];
        newHistory.shift();
        return { ...a, isTransferred: undoTransfer.originalTransferred, transferHistory: newHistory };
      }
      return a;
    }));
    
    setUndoTransfer(null);
  };

  const categories = Object.values(CSRCategory);
  
  const totalAllocated = useMemo(() => 
    allocations.reduce((sum, a) => sum + a.amount, 0), 
    [allocations]
  );
  
  const percentageDistributed = (totalAllocated / (income || 1)) * 100;

  const handleToggleTransfer = (id: string) => {
    const allocation = allocations.find(a => a.id === id);
    if (!allocation) return;

    if (!allocation.isTransferred) {
      setConfirmId(id);
    } else {
      performToggle(id);
    }
  };

  const performToggle = (id: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        const isNowTransferred = !a.isTransferred;
        const newHistory = [...(a.transferHistory || [])];
        
        if (isNowTransferred) {
          newHistory.unshift({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            amount: a.amount,
            status: 'Completed',
            note: transferNote || 'Manual transfer confirmed'
          });
          
          setUndoTransfer({
            id: a.id,
            originalTransferred: a.isTransferred || false,
            timestamp: Date.now()
          });
        }

        return { ...a, isTransferred: isNowTransferred, transferHistory: newHistory };
      }
      return a;
    }));
    setConfirmId(null);
    setTransferNote('');
  };

  const handleSetTargetAccount = (id: string, accountId: string) => {
    performMapping(id, accountId);
  };

  const performMapping = (allocId: string, accountId: string) => {
    setAllocations(prev => prev.map(a => 
      a.id === allocId ? { ...a, targetAccountId: accountId } : a
    ));
    setMappingConfirm(null);
  };

  // Grouped summary of what to transfer to which account
  const accountTransfers = useMemo(() => {
    // Use an object to track unique account IDs for the roadmap
    const transferMap: Record<string, { accountName: string; total: number; count: number; items: string[]; purpose: string }> = {};
    
    allocations.forEach(alloc => {
      if (alloc.targetAccountId) {
        const account = accounts.find(acc => acc.id === alloc.targetAccountId);
        if (account) {
          if (!transferMap[alloc.targetAccountId]) {
            transferMap[alloc.targetAccountId] = { 
              accountName: account.name, 
              total: 0, 
              count: 0, 
              items: [],
              purpose: account.purpose || ''
            };
          }
          
          const current = transferMap[alloc.targetAccountId];
          current.total += alloc.amount;
          current.count += 1;
          current.items.push(alloc.name);
        }
      }
    });
    
    return Object.entries(transferMap).map(([id, data]) => ({ id, ...data }));
  }, [allocations, accounts]);

  const handleCopyTransferContent = useCallback((transfer: any) => {
    const text = `รายการโอนไปยังบัญชี: ${transfer.accountName}\nยอดรวม: ${transfer.total.toLocaleString()} บาท\nรายการ: ${transfer.items.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(transfer.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const completedCount = allocations.filter(a => a.isTransferred).length;
  const totalCount = allocations.length;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header / Summary Card */}
      <section className="relative">
        <Card variant="white" padding="lg" className="overflow-visible border-brand-border shadow-soft relative z-10">
          <div className="absolute inset-0 blueprint-grid opacity-10 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">Salary Distribution Hub</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-brand-text flex items-baseline gap-2">
                {formatCurrency(income).replace('฿', '')}
                <span className="text-lg font-bold text-brand-secondary">THB / MONTH</span>
              </h2>
            </div>

            <div className="flex gap-10 md:gap-16">
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">Allocated</p>
                <p className="text-2xl font-black font-mono text-blue-600">{formatCurrency(totalAllocated)}</p>
              </div>
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                    isAllDone ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {completedCount} / {totalCount} Done
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${percentageDistributed}%` }}
                 className={cn("h-full rounded-full transition-all duration-700", 
                   percentageDistributed > 100 ? "bg-red-500" : "bg-blue-600"
                 )}
               />
            </div>
            <div className="flex justify-between items-center mt-3">
               <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
                 {percentageDistributed.toFixed(1)}% of income distributed
               </p>
               {percentageDistributed > 100 && (
                 <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                   <AlertCircle size={10} /> Over Budget Alert
                 </p>
               )}
            </div>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
        {/* Left Column: Grouped Mapping */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          {categories.map((cat) => {
            const catAllocations = allocations.filter(a => a.category === cat);
            if (catAllocations.length === 0) return null;

            return (
              <div 
                key={cat} 
                className="flex flex-col gap-4 relative transition-all duration-300"
              >
                <div className="flex items-center gap-3 px-2">
                   <div className={cn("w-2 h-2 rounded-full", 
                     cat === CSRCategory.CONSTANT ? "bg-orange-400" :
                     cat === CSRCategory.SPENDING ? "bg-blue-400" : "bg-emerald-400"
                   )} />
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-text">{cat} Allocations</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {catAllocations.map((alloc) => (
                    <div 
                      key={alloc.id} 
                      className="flex flex-col relative transition-all duration-300"
                    >
                      <motion.div 
                        layout
                        className={cn(
                          "group border rounded-2xl flex flex-col md:flex-row md:items-center justify-between p-4 transition-all duration-500 relative",
                          alloc.isTransferred 
                            ? "border-emerald-100 bg-emerald-50/20 shadow-none ring-0 pointer-events-none opacity-80" 
                            : "border-brand-border bg-white hover:border-blue-600/30 hover:shadow-soft"
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1 relative z-10">
                          <button 
                            onClick={() => handleToggleTransfer(alloc.id)}
                            className={cn(
                              "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300",
                              alloc.isTransferred ? "bg-emerald-500 text-white shadow-soft" : "bg-brand-bg text-brand-secondary hover:bg-blue-50 hover:text-blue-600"
                            )}
                          >
                            {alloc.isTransferred ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("text-xs font-black uppercase tracking-wider transition-all truncate", 
                                alloc.isTransferred ? "text-emerald-700 opacity-60 line-through" : "text-brand-text"
                              )}>
                                {alloc.name}
                              </span>
                              <div className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                alloc.isTransferred ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                              )}>
                                {alloc.isTransferred ? 'Completed' : 'Pending'}
                              </div>
                            </div>
                            <span className={cn("text-sm font-black font-mono tracking-tight", 
                              alloc.isTransferred ? "text-emerald-600/60" : "text-blue-600"
                            )}>
                              {formatCurrency(alloc.amount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-brand-border/50 relative z-10 w-full md:w-auto">
                          <div className="flex flex-col items-start md:items-end gap-1.5 flex-1 md:flex-none w-full md:w-auto">
                            <label className="text-[8px] font-black text-brand-muted uppercase tracking-widest leading-none ml-1 md:mr-1">Destined Account</label>
                            <AccountPicker 
                              value={alloc.targetAccountId || ''}
                              onChange={(accountId) => handleSetTargetAccount(alloc.id, accountId)}
                              accounts={accounts}
                              disabled={alloc.isTransferred}
                            />
                          </div>
                          
                          <div className="w-px h-8 bg-brand-border hidden md:block" />
                          
                          <button 
                            onClick={() => setExpandedId(expandedId === alloc.id ? null : alloc.id)}
                            className={cn(
                              "hidden md:flex items-center justify-center w-8 h-8 rounded-full transition-all",
                              expandedId === alloc.id ? "bg-blue-600 text-white shadow-blue" : "bg-brand-bg text-brand-secondary hover:bg-blue-50 hover:text-blue-600"
                            )}
                          >
                             <ChevronDown size={14} className={cn("transition-transform duration-300", expandedId === alloc.id && "rotate-180")} />
                          </button>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {expandedId === alloc.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-14 py-4 flex flex-col gap-4">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <HistoryIcon size={12} className="text-brand-muted" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">Transfer History</span>
                                </div>
                                {alloc.transferHistory && alloc.transferHistory.length > 0 && (
                                  <button 
                                    onClick={() => {
                                      setAllocations(prev => prev.map(a => a.id === alloc.id ? { ...a, transferHistory: [] } : a));
                                    }}
                                    className="text-[8px] font-black text-brand-secondary hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 size={10} /> Clear History
                                  </button>
                                )}
                              </div>
                              
                              {alloc.transferHistory && alloc.transferHistory.length > 0 ? (
                                <div className="flex flex-col gap-2 relative">
                                  <div className="absolute left-3 top-0 bottom-0 w-px bg-brand-border/30" />
                                  {alloc.transferHistory.map((log) => (
                                    <div key={log.id} className="relative pl-8 mb-4 last:mb-0">
                                      <div className="absolute left-[-1.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                                      <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border/30 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">
                                              {log.status}
                                            </span>
                                            <span className="text-[9px] font-bold text-brand-muted">
                                              {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                          </div>
                                          <span className="text-sm font-black font-mono text-brand-text">{formatCurrency(log.amount)}</span>
                                        </div>
                                        {log.note && (
                                          <div className="flex items-start gap-2 p-2 bg-white/50 rounded-xl border border-brand-border/10 mt-2 italic shadow-inner">
                                            <MessageSquare size={10} className="text-brand-muted mt-0.5 shrink-0" />
                                            <p className="text-[10px] font-medium text-brand-secondary leading-relaxed">
                                              {log.note}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-8 text-center border-2 border-dashed border-brand-border/50 rounded-[2rem] bg-brand-bg/30">
                                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <HistoryIcon size={20} className="text-brand-muted opacity-30" />
                                  </div>
                                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">No history records yet</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Execution Summary */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="sticky top-8 flex flex-col gap-6">
            <Card variant="dark" padding="none" className="overflow-hidden">
               <div className="p-6 border-b border-white/10 bg-white/5">
                 <div className="flex items-center gap-2 mb-1">
                   <ArrowRightLeft size={14} className="text-blue-400" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Execution Roadmap</h3>
                 </div>
                 <p className="text-[10px] text-white/40 leading-relaxed font-bold">สรุปยอดที่ต้องโอนเข้าแต่ละบัญชีเพื่อให้ถึงเป้าหมาย</p>
               </div>
               
               <div className="p-6 flex flex-col gap-4">
                 {accountTransfers.map(transfer => (
                   <div key={transfer.id} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group overflow-hidden relative">
                     <div className="flex justify-between items-start relative z-10">
                       <div className="min-w-0">
                         <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Target Account</p>
                         <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">{transfer.accountName}</h4>
                       </div>
                       <div className="text-right shrink-0">
                         <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Total to Transfer</p>
                         <p className="text-lg font-black font-mono text-emerald-400 tracking-tighter">{formatCurrency(transfer.total)}</p>
                       </div>
                     </div>
                     
                     <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5 relative z-10">
                        {transfer.items.map((item, idx) => (
                          <span key={idx} className="text-[8px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                            {item}
                          </span>
                        ))}
                     </div>
                     
                     <div className="mt-2 flex justify-end relative z-10">
                        <button 
                          onClick={() => handleCopyTransferContent(transfer)}
                          className={cn(
                            "text-[8px] font-black flex items-center gap-1.5 uppercase tracking-widest transition-all px-3 py-1.5 rounded-lg",
                            copiedId === transfer.id 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "text-blue-400 hover:bg-blue-500/10 hover:text-white"
                          )}
                        >
                           {copiedId === transfer.id ? <Check size={10} /> : <Copy size={10} />}
                           {copiedId === transfer.id ? "COPIED" : "COPY DETAILS"}
                        </button>
                     </div>
                   </div>
                 ))}
                 
                 {accountTransfers.length === 0 && (
                   <div className="py-10 text-center opacity-40">
                     <AlertCircle size={24} className="mx-auto mb-3" />
                     <p className="text-[10px] font-black uppercase tracking-widest">No mapping detected</p>
                     <p className="text-[9px] font-medium mt-1">Please map allocations to accounts</p>
                   </div>
                 )}
               </div>

               <div className="p-6 bg-blue-600">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Cycle Progress</span>
                      <span className="text-[10px] font-black font-mono">{Math.round((completedCount / (totalCount || 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${(completedCount / (totalCount || 1)) * 100}%` }}
                         className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                       />
                    </div>
                    {isAllDone && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 text-white bg-white/20 p-3 rounded-xl backdrop-blur-md"
                      >
                         <Check size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">All Transfers Executed!</span>
                      </motion.div>
                    )}
                  </div>
               </div>
            </Card>

            {/* AI Advisor Note */}
            <Card variant="glass" padding="md" className="border-brand-border/20">
               <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">Architect Insight</p>
                    <p className="text-xs font-bold text-brand-text leading-relaxed">
                      การวางระบบ "ศูนย์กลางกระจายรายได้" (Salary Hub) ช่วยลดความผิดพลาดในการจัดการเงินรายเดือน 
                      <span className="text-blue-600 ml-1">แนะนำให้ตั้งค่าโอนล่วงหน้า (Automatic Transfer) ในแอปธนาคารของคุณตามยอดนี้</span>
                    </p>
                  </div>
               </div>
            </Card>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmId(null)}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] border border-brand-border shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute inset-0 blueprint-grid opacity-10 pointer-events-none" />
              <div className="p-8 pb-4 relative z-10">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-blue-500/10">
                  <ArrowRightLeft className="text-blue-600" size={24} />
                </div>
                <h3 className="text-2xl font-black text-brand-text tracking-tighter mb-2">Verify Transfer</h3>
                <p className="text-sm font-bold text-brand-muted leading-relaxed">
                  Are you sure you want to mark this allocation as <span className="text-blue-600 text-bold uppercase">Transferred</span> to the target account? 
                </p>
                
                <div className="mt-8 flex flex-col gap-4">
                  <div className="p-4 bg-brand-bg/50 rounded-2xl border border-brand-border/50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none mb-1">Item</span>
                      <span className="text-sm font-black text-brand-text">{allocations.find(a => a.id === confirmId)?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none mb-1">Amount</span>
                      <span className="text-sm font-black font-mono text-blue-600">{formatCurrency(allocations.find(a => a.id === confirmId)?.amount || 0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Transfer Note (Optional)</label>
                    <input 
                      type="text"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      placeholder="Add a reason or reference..."
                      className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 flex gap-3 relative z-10">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest border-brand-border"
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 rounded-xl h-12 bg-blue-600 text-white font-black uppercase tracking-widest shadow-blue hover:bg-blue-700"
                  onClick={() => performToggle(confirmId)}
                >
                  Confirm Transfer
                </Button>
              </div>
              
              <button 
                onClick={() => { setConfirmId(null); setTransferNote(''); }}
                className="absolute top-6 right-6 text-brand-secondary hover:text-brand-text transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}

        {undoTransfer && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-brand-text text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check size={16} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest">Transfer Confirmed</p>
                  <p className="text-[8px] font-medium text-white/60 uppercase tracking-widest">Action will be finalized in 10s</p>
                </div>
              </div>
              <button 
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
              >
                <Undo2 size={12} /> Undo
              </button>
            </div>
          </motion.div>
        )}

        {isAllDone && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
             {/* Simple celebration effect could go here if needed */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
