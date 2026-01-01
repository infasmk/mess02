import React, { useState, useEffect } from 'react';
import { messStore } from '../store/messStore.ts';
import { MealPlan } from '../types.ts';
import { Card, Button, Input, Modal } from '../components/UI.tsx';
import { formatCurrency } from '../utils/helpers.ts';
import { Plus, Edit2, Utensils, Check, ChefHat, Loader2 } from 'lucide-react';

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    monthly_price: string;
    meals: string[];
  }>({
    name: '',
    monthly_price: '',
    meals: []
  });

  useEffect(() => {
    const load = async () => {
        if(messStore.isLoading) await messStore.init();
        setPlans([...messStore.plans]);
        setLoading(false);
    };
    load();
  }, []);

  const refreshPlans = () => setPlans([...messStore.plans]);

  const handleOpenModal = (plan?: MealPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        monthly_price: plan.monthly_price.toString(),
        meals: plan.meals
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', monthly_price: '', meals: ['Breakfast', 'Lunch', 'Dinner'] });
    }
    setIsModalOpen(true);
  };

  const handleToggleMeal = (meal: string) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.includes(meal)
        ? prev.meals.filter(m => m !== meal)
        : [...prev.meals, meal]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.monthly_price) return;

    setIsSubmitting(true);
    const price = parseFloat(formData.monthly_price);
    
    try {
        if (editingPlan) {
        await messStore.updatePlan({
            ...editingPlan,
            name: formData.name,
            monthly_price: price,
            meals: formData.meals
        });
        } else {
        await messStore.addPlan({
            name: formData.name,
            monthly_price: price,
            meals: formData.meals
        });
        }
        setIsModalOpen(false);
        refreshPlans();
    } catch (err: any) {
        alert("Failed to save plan: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
     return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="animate-spin text-indigo-600" size={32} />
       </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Meal Plans</h2>
          <p className="text-slate-500 font-medium">Configure mess pricing and inclusions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="shadow-indigo-200 shadow-md">
          <Plus size={18} />
          <span>Create Plan</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className="p-6 relative hover:border-indigo-200 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 ring-1 ring-indigo-500/10 group-hover:scale-110 transition-transform">
                <ChefHat size={28} />
              </div>
              <button onClick={() => handleOpenModal(plan)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                <Edit2 size={18} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <p className="text-3xl font-bold text-indigo-600">{formatCurrency(plan.monthly_price)}</p>
              <span className="text-sm text-slate-400 font-medium">/month</span>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Includes</p>
              <div className="space-y-2">
                {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                  <div key={meal} className="flex items-center justify-between">
                     <span className={`text-sm font-medium ${plan.meals.includes(meal) ? 'text-slate-700' : 'text-slate-400'}`}>{meal}</span>
                     {plan.meals.includes(meal) ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <Check size={12} strokeWidth={3} />
                        </div>
                     ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100"></div>
                     )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? "Edit Meal Plan" : "Create Meal Plan"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label="Plan Name" 
            placeholder="e.g. Premium Mess" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required 
          />
          
          <Input 
            label="Monthly Price (₹)" 
            type="number" 
            placeholder="3000" 
            value={formData.monthly_price} 
            onChange={e => setFormData({...formData, monthly_price: e.target.value})} 
            required 
            min="0"
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">Included Meals</label>
            <div className="grid grid-cols-3 gap-3">
              {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                <button
                  type="button"
                  key={meal}
                  onClick={() => handleToggleMeal(meal)}
                  className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    formData.meals.includes(meal) 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
            {formData.meals.length === 0 && <p className="text-xs text-rose-500 mt-2 font-medium">Please select at least one meal type.</p>}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={formData.meals.length === 0 || isSubmitting}>
            {isSubmitting ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Plans;