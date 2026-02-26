// 由于代码量巨大，这里继续添加核心功能组件

// Training Page Component - 训练页面
const TrainingPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('chat'); // chat, physical, auxiliary, diagnosis
    const [diagnosis, setDiagnosis] = useState('');
    const [physicalExams, setPhysicalExams] = useState([]);
    const [auxiliaryExams, setAuxiliaryExams] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSession = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get(`/sessions/${sessionId}`, token);
            setSession(data);
            
            // Load chat history
            const dialogues = await api.get(`/sessions/${sessionId}/dialogues`, token);
            setMessages(dialogues.map(d => ({
                role: d.role,
                content: d.message,
                timestamp: d.timestamp
            })));
            
            setLoading(false);
        } catch (err) {
            console.error(err);
            alert('加载会话失败');
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;
        
        const userMessage = inputMessage;
        setInputMessage('');
        
        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        
        try {
            const token = localStorage.getItem('token');
            
            // Save user message
            await api.post('/dialogues', {
                session_id: parseInt(sessionId),
                message: userMessage,
                role: 'user'
            }, token);
            
            // Get AI response
            const aiResponse = await getAIResponse(userMessage, session.case);
            
            // Add AI message
            setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
            
            // Save AI message
            await api.post('/dialogues', {
                session_id: parseInt(sessionId),
                message: aiResponse,
                role: 'ai'
            }, token);
            
        } catch (err) {
            console.error(err);
        }
    };

    const getAIResponse = async (question, caseData) => {
        // Simulate AI response based on case data
        const q = question.toLowerCase();
        const symptoms = caseData.symptoms || [];
        const questions = caseData.questions || [];
        const answers = caseData.answers || [];
        const patientInfo = caseData.patient_info || {};
        
        // Simple keyword matching for demo
        if (q.includes('年龄') || q.includes('多大')) {
            return `患者${patientInfo.age}岁。`;
        }
        if (q.includes('性别') || q.includes('男女')) {
            return `患者是${patientInfo.gender === 'male' ? '男性' : '女性'}。`;
        }
        if (q.includes('症状') || q.includes('不舒服')) {
            return `患者主要症状有：${symptoms.join('、')}。`;
        }
        if (q.includes('疼痛') || q.includes('疼')) {
            const painSymptom = symptoms.find(s => s.includes('痛'));
            return painSymptom || '患者有疼痛症状。';
        }
        if (q.includes('病史') || q.includes('以前')) {
            return '患者有一些既往病史，需要具体询问。';
        }
        
        // Match preset questions
        for (let i = 0; i < questions.length; i++) {
            if (q.includes(questions[i].substring(0, 4))) {
                return answers[i] || '需要进一步检查确认。';
            }
        }
        
        return '请继续询问更多细节，或根据已有信息进行诊断。';
    };

    const submitDiagnosis = async () => {
        if (!diagnosis.trim()) {
            alert('请输入诊断');
            return;
        }
        
        if (!confirm('确定提交诊断吗？提交后将无法修改。')) return;
        
        try {
            const token = localStorage.getItem('token');
            const result = await api.post(`/sessions/${sessionId}/diagnosis`, {
                diagnosis: diagnosis
            }, token);
            
            alert(`诊断提交成功！\n得分：${result.score}分`);
            navigate(`/report/${sessionId}`);
        } catch (err) {
            alert('提交失败');
        }
    };

    if (loading) return <div className="p-8 text-center"><Icon name="loading" className="w-8 h-8 mx-auto" /></div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="gradient-bg text-white p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{session?.case?.title}</h1>
                        <p className="text-sm opacity-90">{TRAINING_MODES.find(m => m.id === session?.mode)?.name || '实战演练模式'}</p>
                    </div>
                    <Badge color="blue">{session?.case?.difficulty}</Badge>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Patient Info & Navigation */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold mb-2">👤 患者信息</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>年龄：{session?.case?.patient_info?.age}岁</p>
                            <p>性别：{session?.case?.patient_info?.gender === 'male' ? '男' : '女'}</p>
                            <p>主诉：{session?.case?.description?.substring(0, 50)}...</p>
                        </div>
                    </div>
                    
                    <nav className="p-2 space-y-1">
                        {[
                            { id: 'chat', label: '💬 问诊对话', icon: 'message' },
                            { id: 'physical', label: '🩺 体格检查', icon: 'activity' },
                            { id: 'auxiliary', label: '🔬 辅助检查', icon: 'fileText' },
                            { id: 'diagnosis', label: '📝 提交诊断', icon: 'clipboard' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon name={tab.icon} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                {/* Right Panel - Content */}
                <div className="flex-1 bg-gray-50 flex flex-col">
                    {activeTab === 'chat' && (
                        <>
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                            msg.role === 'user' 
                                                ? 'gradient-bg text-white rounded-br-none' 
                                                : 'bg-white shadow-sm rounded-bl-none'
                                        }`}>
                                            <p>{msg.content}</p>
                                            <span className="text-xs opacity-70">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            
                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-gray-200">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={e => setInputMessage(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && sendMessage()}
                                        placeholder="输入您的问题..."
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <Button onClick={sendMessage}>发送</Button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {activeTab === 'physical' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">体格检查</h3>
                            <p className="text-gray-500">选择检查部位进行查体...</p>
                            {/* Physical exam content would go here */}
                        </div>
                    )}
                    
                    {activeTab === 'auxiliary' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">辅助检查</h3>
                            <p className="text-gray-500">选择需要进行的辅助检查...</p>
                            {/* Auxiliary exam content would go here */}
                        </div>
                    )}
                    
                    {activeTab === 'diagnosis' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">提交最终诊断</h3>
                            <textarea
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                                placeholder="根据问诊、查体和辅助检查结果，输入您的最终诊断..."
                                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            />
                            <div className="mt-4 flex gap-3">
                                <Button onClick={submitDiagnosis}>提交诊断</Button>
                                <Button variant="secondary" onClick={() => setActiveTab('chat')}>返回问诊</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Report Page Component - 评价报告页面
const ReportPage = () => {
    const { sessionId } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, [sessionId]);

    const loadReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const session = await api.get(`/sessions/${sessionId}`, token);
            setReport(session);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center"><Icon name="loading" className="w-8 h-8 mx-auto" /></div>;

    const score = report?.score || 0;
    const isPass = score >= 60;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-8 text-center">
                <div className={`text-6xl font-bold mb-4 ${isPass ? 'text-green-500' : 'text-red-500'}`}>
                    {score}分
                </div>
                <p className="text-xl text-gray-600">
                    {isPass ? '恭喜！诊断正确' : '继续加油，诊断有误'}
                </p>
                <div className="mt-4">
                    <p className="text-gray-500">您的诊断：{report?.student_diagnosis}</p>
                    <p className="text-gray-500">正确诊断：{report?.case?.diagnosis}</p>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">五维度评分</h3>
                <div className="space-y-4">
                    {SCORING_DIMENSIONS.map(dim => (
                        <div key={dim.key}>
                            <div className="flex justify-between mb-1">
                                <span>{dim.icon} {dim.name}</span>
                                <span className="font-medium">{Math.round(score * dim.weight / 100)}/{dim.weight}分</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                                <div 
                                    className="h-full gradient-bg rounded-full transition-all duration-500"
                                    style={{ width: `${score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-center gap-4">
                <Button onClick={() => window.location.href = '/cases'}>继续训练</Button>
                <Button variant="secondary" onClick={() => window.location.href = '/history'}>查看历史</Button>
            </div>
        </div>
    );
};

// History Page Component - 训练历史页面
const HistoryPage = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/sessions', token);
            setSessions(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center"><Icon name="loading" className="w-8 h-8 mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">训练历史</h1>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">病例</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模式</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">得分</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sessions.map(session => (
                                <tr key={session.id}>
                                    <td className="px-6 py-4">{session.case?.title}</td>
                                    <td className="px-6 py-4">{TRAINING_MODES.find(m => m.id === session.mode)?.name || '实战演练'}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={session.status === 'completed' ? 'green' : 'yellow'}>
                                            {session.status === 'completed' ? '已完成' : '进行中'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.score !== null ? `${session.score}分` : '-'}
                                    </td>
                                    <td className="px-6 py-4">{new Date(session.started_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        {session.status === 'completed' ? (
                                            <Link to={`/report/${session.id}`}>
                                                <Button size="sm" variant="secondary">查看报告</Button>
                                            </Link>
                                        ) : (
                                            <Link to={`/training/${session.id}`}>
                                                <Button size="sm">继续训练</Button>
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// Teacher Cases Page - 教师病例管理
const TeacherCasesPage = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCase, setEditingCase] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: '中等',
        diagnosis: '',
        patient_age: '',
        patient_gender: 'male',
        symptoms: [''],
        questions: [''],
        answers: ['']
    });

    useEffect(() => {
        loadCases();
    }, []);

    const loadCases = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/cases', token);
            setCases(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const data = {
                ...formData,
                patient_info: {
                    age: parseInt(formData.patient_age),
                    gender: formData.patient_gender
                },
                symptoms: formData.symptoms.filter(s => s),
                questions: formData.questions.filter(q => q),
                answers: formData.answers.filter(a => a)
            };
            
            if (editingCase) {
                await api.put(`/cases/${editingCase.id}`, data, token);
            } else {
                await api.post('/cases', data, token);
            }
            
            setShowModal(false);
            setEditingCase(null);
            loadCases();
        } catch (err) {
            alert('保存失败');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确定删除该病例吗？')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/cases/${id}`, token);
            loadCases();
        } catch (err) {
            alert('删除失败');
        }
    };

    const openEditModal = (c) => {
        setEditingCase(c);
        setFormData({
            title: c.title,
            description: c.description,
            difficulty: c.difficulty,
            diagnosis: c.diagnosis,
            patient_age: c.patient_info?.age,
            patient_gender: c.patient_info?.gender,
            symptoms: c.symptoms.length ? c.symptoms : [''],
            questions: c.questions.length ? c.questions : [''],
            answers: c.answers.length ? c.answers : ['']
        });
        setShowModal(true);
    };

    const addArrayField = (field) => {
        setFormData({ ...formData, [field]: [...formData[field], ''] });
    };

    const updateArrayField = (field, index, value) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const removeArrayField = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray.length ? newArray : [''] });
    };

    if (loading) return <div className="p-8 text-center"><Icon name="loading" className="w-8 h-8 mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">病例管理</h1>
                <Button onClick={() => {
                    setEditingCase(null);
                    setFormData({
                        title: '',
                        description: '',
                        difficulty: '中等',
                        diagnosis: '',
                        patient_age: '',
                        patient_gender: 'male',
                        symptoms: [''],
                        questions: [''],
                        answers: ['']
                    });
                    setShowModal(true);
                }}>
                    <Icon name="plus" className="w-4 h-4 mr-2" />
                    创建病例
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">难度</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">诊断</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {cases.map(c => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4">{c.title}</td>
                                    <td className="px-6 py-4"><Badge color={DIFFICULTIES.find(d => d.value === c.difficulty)?.color}>{c.difficulty}</Badge></td>
                                    <td className="px-6 py-4">{c.diagnosis}</td>
                                    <td className="px-6 py-4">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => openEditModal(c)}>编辑</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)}>删除</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal */}
            {showModal && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCase ? '编辑病例' : '创建病例'} size="lg">
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">描述 *</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({...formData, difficulty: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">诊断 *</label>
                                <input
                                    type="text"
                                    value={formData.diagnosis}
                                    onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">患者年龄</label>
                                <input
                                    type="number"
                                    value={formData.patient_age}
                                    onChange={e => setFormData({...formData, patient_age: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">患者性别</label>
                                <select
                                    value={formData.patient_gender}
                                    onChange={e => setFormData({...formData, patient_gender: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="male">男</option>
                                    <option value="female">女</option>
                                </select>
                            </div>
                        </div>

                        {/* Symptoms */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">症状</label>
                            {formData.symptoms.map((s, i) => (
                                <div key={i} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={s}
                                        onChange={e => updateArrayField('symptoms', i, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="症状"
                                    />
                                    <Button type="button" variant="danger" size="sm" onClick={() => removeArrayField('symptoms', i)}>删除</Button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" size="sm" onClick={() => addArrayField('symptoms')}>添加症状</Button>
                        </div>

                        {/* Questions & Answers */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">问诊问题与答案</label>
                            {formData.questions.map((q, i) => (
                                <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={q}
                                        onChange={e => updateArrayField('questions', i, e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="问题"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.answers[i] || ''}
                                            onChange={e => updateArrayField('answers', i, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="答案"
                                        />
                                        <Button type="button" variant="danger" size="sm" onClick={() => {
                                            removeArrayField('questions', i);
                                            removeArrayField('answers', i);
                                        }}>删除</Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" size="sm" onClick={() => {
                                addArrayField('questions');
                                addArrayField('answers');
                            }}>添加问答</Button>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
                            <Button type="submit">{editingCase ? '更新' : '创建'}</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// Teacher Classes Page - 教师班级管理
const TeacherClassesPage = () => {
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [currentClass, setCurrentClass] = useState(null);
    const [className, setClassName] = useState('');

    useEffect(() => {
        loadClasses();
        loadStudents();
    }, []);

    const loadClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/classes', token);
            setClasses(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const loadStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/users?role=student', token);
            setStudents(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/classes', { name: className }, token);
            setShowModal(false);
            setClassName('');
            loadClasses();
        } catch (err) {
            alert('创建失败');
        }
    };

    const handleDeleteClass = async (id) => {
        if (!confirm('确定删除该班级吗？')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/classes/${id}`, token);
            loadClasses();
        } catch (err) {
            alert('删除失败');
        }
    };

    const handleAddStudent = async (studentId) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(`/classes/${currentClass.id}/students`, { student_id: studentId }, token);
            loadClasses();
        } catch (err) {
            alert('添加失败');
        }
    };

    const handleRemoveStudent = async (studentId) => {
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/classes/${currentClass.id}/students/${studentId}`, token);
            loadClasses();
        } catch (err) {
            alert('移除失败');
        }
    };

    if (loading) return <div className="p-8 text-center"><Icon name="loading" className="w-8 h-8 mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">班级管理</h1>
                <Button onClick={() => setShowModal(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" />
                    创建班级
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => (
                    <Card key={cls.id} className="p-6" hover>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold">{cls.name}</h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => {
                                    setCurrentClass(cls);
                                    setShowManageModal(true);
                                }}>管理</Button>
                                <Button size="sm" variant="danger" onClick={() => handleDeleteClass(cls.id)}>删除</Button>
                            </div>
                        </div>
                        <p className="text-gray-500">学生人数：{cls.students?.length || 0}人</p>
                        <p className="text-gray-400 text-sm mt-2">创建于 {new Date(cls.created_at).toLocaleDateString()}</p>
                    </Card>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="创建班级">
                    <form onSubmit={handleCreateClass} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">班级名称</label>
                            <input
                                type="text"
                                value={className}
                                onChange={e => setClassName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
                            <Button type="submit">创建</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Manage Modal */}
            {showManageModal && currentClass && (
                <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title={`管理班级：${currentClass.name}`} size="lg">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium mb-2">班级学生</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {currentClass.students?.map(student => (
                                    <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{student.full_name} ({student.username})</span>
                                        <Button size="sm" variant="danger" onClick={() => handleRemoveStudent(student.id)}>移除</Button>
                                    </div>
                                )) || <p className="text-gray-500">暂无学生</p>}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-medium mb-2">添加学生</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {students.filter(s => !currentClass.students?.find(cs => cs.id === s.id)).map(student => (
                                    <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{student.full_name} ({student.username})</span>
                                        <Button size="sm" onClick={() => handleAddStudent(student.id)}>添加</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Update Routes in App component
// Add these routes to the Routes component:
// <Route path="/training/:sessionId" element={<Layout><TrainingPage /></Layout>} />
// <Route path="/report/:sessionId" element={<Layout><ReportPage /></Layout>} />
// <Route path="/history" element={<Layout><HistoryPage /></Layout>} />
// <Route path="/teacher/cases" element={<Layout><TeacherCasesPage /></Layout>} />
// <Route path="/teacher/classes" element={<Layout><TeacherClassesPage /></Layout>} />