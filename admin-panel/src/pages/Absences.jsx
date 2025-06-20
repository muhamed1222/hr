import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Absences() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    userId: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const typeLabels = {
    vacation: { label: 'Отпуск', icon: '🌴' },
    sick: { label: 'Больничный', icon: '🤒' },
    business_trip: { label: 'Командировка', icon: '🧳' },
    day_off: { label: 'Отгул', icon: '🏠' }
  };

  const statusLabels = {
    pending: { label: 'На рассмотрении', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    approved: { label: 'Одобрена', color: 'text-green-600', bg: 'bg-green-100' },
    rejected: { label: 'Отклонена', color: 'text-red-600', bg: 'bg-red-100' }
  };

  useEffect(() => {
    fetchAbsences();
  }, [filters, pagination.page]);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`/api/absences?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки заявок');
      }

      const data = await response.json();
      setAbsences(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDecision = async () => {
    if (!selectedAbsence) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/absences/${selectedAbsence.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === 'rejected' ? rejectionReason : null
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка принятия решения');
      }

      setShowDecisionModal(false);
      setSelectedAbsence(null);
      setRejectionReason('');
      fetchAbsences();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDecisionModal = (absence) => {
    setSelectedAbsence(absence);
    setDecision('approved');
    setRejectionReason('');
    setShowDecisionModal(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU');
  };

  if (loading && absences.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Заявки на отсутствие</h1>
        </div>

        {/* Фильтры */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Фильтры</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Статус
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Все статусы</option>
                  <option value="pending">На рассмотрении</option>
                  <option value="approved">Одобрена</option>
                  <option value="rejected">Отклонена</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Все типы</option>
                  <option value="vacation">Отпуск</option>
                  <option value="sick">Больничный</option>
                  <option value="business_trip">Командировка</option>
                  <option value="day_off">Отгул</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата от
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата до
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setFilters({
                      status: '',
                      type: '',
                      userId: '',
                      startDate: '',
                      endDate: ''
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Список заявок */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Период
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дней
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Подана
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {absences.map((absence) => {
                  const typeInfo = typeLabels[absence.type];
                  const statusInfo = statusLabels[absence.status];
                  
                  return (
                    <tr key={absence.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {absence.user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{absence.user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm">
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {absence.daysCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(absence.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {absence.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openDecisionModal(absence)}
                            >
                              Рассмотреть
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: Открыть детали */}}
                          >
                            Подробнее
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Пагинация */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Предыдущая
            </Button>
            <span className="text-sm text-gray-700">
              Страница {pagination.page} из {pagination.pages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Следующая
            </Button>
          </div>
        )}

        {/* Модальное окно принятия решения */}
        {showDecisionModal && selectedAbsence && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Рассмотрение заявки
                </h3>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm">
                    <strong>Сотрудник:</strong> {selectedAbsence.user.name}
                  </p>
                  <p className="text-sm">
                    <strong>Тип:</strong> {typeLabels[selectedAbsence.type].icon} {typeLabels[selectedAbsence.type].label}
                  </p>
                  <p className="text-sm">
                    <strong>Период:</strong> {formatDate(selectedAbsence.startDate)} - {formatDate(selectedAbsence.endDate)}
                  </p>
                  <p className="text-sm">
                    <strong>Дней:</strong> {selectedAbsence.daysCount}
                  </p>
                  {selectedAbsence.reason && (
                    <p className="text-sm">
                      <strong>Причина:</strong> {selectedAbsence.reason}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Решение
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="approved"
                        checked={decision === 'approved'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="mr-2"
                      />
                      ✅ Одобрить
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="rejected"
                        checked={decision === 'rejected'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="mr-2"
                      />
                      ❌ Отклонить
                    </label>
                  </div>
                </div>

                {decision === 'rejected' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Причина отклонения
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Укажите причину отклонения заявки..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows="3"
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDecisionModal(false)}
                    disabled={submitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleDecision}
                    disabled={submitting || (decision === 'rejected' && !rejectionReason.trim())}
                  >
                    {submitting ? 'Сохранение...' : 'Сохранить решение'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 