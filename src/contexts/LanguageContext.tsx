import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'bn';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  bn: 'বাংলা',
};

type Translations = Record<string, string>;

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    app_name: 'DocPlus',
    medical_portal: 'Medical Portal',
    patient_portal: 'Patient Portal',

    nav_dashboard: 'Dashboard',
    nav_ai_assistant: 'AI Assistant',
    nav_patients: 'Patients',
    nav_appointments: 'Appointments',
    nav_prescriptions: 'Prescriptions',
    nav_disease_programs: 'Disease Programs',
    nav_clinical_modules: 'Clinical Modules',
    nav_ai_support: 'AI Support',
    nav_my_doctor: 'My Doctor',
    nav_my_programs: 'My Programs',
    nav_my_records: 'My Records',
    nav_settings: 'Settings',
    nav_help: 'Help & Support',
    nav_logout: 'Logout',

    settings_title: 'Settings & Preferences',
    settings_subtitle: 'Customize your DocPlus experience',
    settings_notifications: 'Notifications',
    settings_appearance: 'Appearance',
    settings_privacy: 'Privacy & Security',
    settings_language: 'Language & Region',
    save_changes: 'Save Changes',
    saved: 'Saved!',

    chat_no_messages: 'No messages yet. Start the conversation!',
    chat_placeholder: 'Type your message...',
    chat_send: 'Send',
    chat_doctor: 'Doctor',
    chat_patient: 'Patient',
    chat_you: 'You',
    chat_soap: 'Generate SOAP Note',
    chat_soap_loading: 'Generating...',
    chat_unread: 'unread',
    chat_read: 'Read',
    chat_sent: 'Sent',
    chat_attach: 'Attach file',
    chat_templates: 'Quick replies',
    chat_add_template: 'Add template',
    chat_no_session: 'No Chat Session',
    chat_select_patient: 'Select a patient to start a conversation',
    chat_loading: 'Loading chat...',

    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    search: 'Search',
    no_data: 'No data found',
    go_back: 'Go Back',
    new_ai_chat: 'New AI Chat',
    medical_professional: 'Medical Professional',
    patient_account: 'Patient Account',
  },

  hi: {
    app_name: 'DocPlus',
    medical_portal: 'चिकित्सा पोर्टल',
    patient_portal: 'रोगी पोर्टल',

    nav_dashboard: 'डैशबोर्ड',
    nav_ai_assistant: 'AI सहायक',
    nav_patients: 'रोगी',
    nav_appointments: 'नियुक्तियाँ',
    nav_prescriptions: 'नुस्खे',
    nav_disease_programs: 'रोग कार्यक्रम',
    nav_clinical_modules: 'नैदानिक मॉड्यूल',
    nav_ai_support: 'AI सहायता',
    nav_my_doctor: 'मेरे डॉक्टर',
    nav_my_programs: 'मेरे कार्यक्रम',
    nav_my_records: 'मेरे रिकॉर्ड',
    nav_settings: 'सेटिंग्स',
    nav_help: 'सहायता',
    nav_logout: 'लॉग आउट',

    settings_title: 'सेटिंग्स और प्राथमिकताएं',
    settings_subtitle: 'अपना DocPlus अनुभव कस्टमाइज़ करें',
    settings_notifications: 'सूचनाएं',
    settings_appearance: 'दिखावट',
    settings_privacy: 'गोपनीयता और सुरक्षा',
    settings_language: 'भाषा और क्षेत्र',
    save_changes: 'परिवर्तन सहेजें',
    saved: 'सहेजा गया!',

    chat_no_messages: 'अभी तक कोई संदेश नहीं। बातचीत शुरू करें!',
    chat_placeholder: 'संदेश लिखें...',
    chat_send: 'भेजें',
    chat_doctor: 'डॉक्टर',
    chat_patient: 'रोगी',
    chat_you: 'आप',
    chat_soap: 'SOAP नोट बनाएं',
    chat_soap_loading: 'बन रहा है...',
    chat_unread: 'अपठित',
    chat_read: 'पढ़ा गया',
    chat_sent: 'भेजा गया',
    chat_attach: 'फ़ाइल संलग्न करें',
    chat_templates: 'त्वरित उत्तर',
    chat_add_template: 'टेम्पलेट जोड़ें',
    chat_no_session: 'कोई चैट सत्र नहीं',
    chat_select_patient: 'बातचीत शुरू करने के लिए रोगी चुनें',
    chat_loading: 'चैट लोड हो रही है...',

    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    delete: 'हटाएं',
    search: 'खोजें',
    no_data: 'कोई डेटा नहीं मिला',
    go_back: 'वापस जाएं',
    new_ai_chat: 'नई AI चैट',
    medical_professional: 'चिकित्सा पेशेवर',
    patient_account: 'रोगी खाता',
  },

  mr: {
    app_name: 'DocPlus',
    medical_portal: 'वैद्यकीय पोर्टल',
    patient_portal: 'रुग्ण पोर्टल',

    nav_dashboard: 'डॅशबोर्ड',
    nav_ai_assistant: 'AI सहाय्यक',
    nav_patients: 'रुग्ण',
    nav_appointments: 'भेटी',
    nav_prescriptions: 'औषधे',
    nav_disease_programs: 'रोग कार्यक्रम',
    nav_clinical_modules: 'क्लिनिकल मॉड्यूल',
    nav_ai_support: 'AI सहाय्य',
    nav_my_doctor: 'माझे डॉक्टर',
    nav_my_programs: 'माझे कार्यक्रम',
    nav_my_records: 'माझे अभिलेख',
    nav_settings: 'सेटिंग्ज',
    nav_help: 'मदत',
    nav_logout: 'बाहेर पडा',

    settings_title: 'सेटिंग्ज आणि प्राधान्ये',
    settings_subtitle: 'तुमचा DocPlus अनुभव सानुकूलित करा',
    settings_notifications: 'सूचना',
    settings_appearance: 'देखावा',
    settings_privacy: 'गोपनीयता आणि सुरक्षा',
    settings_language: 'भाषा आणि प्रदेश',
    save_changes: 'बदल जतन करा',
    saved: 'जतन केले!',

    chat_no_messages: 'अजून कोणतेही संदेश नाहीत. संभाषण सुरू करा!',
    chat_placeholder: 'संदेश टाइप करा...',
    chat_send: 'पाठवा',
    chat_doctor: 'डॉक्टर',
    chat_patient: 'रुग्ण',
    chat_you: 'तुम्ही',
    chat_soap: 'SOAP नोट तयार करा',
    chat_soap_loading: 'तयार होत आहे...',
    chat_unread: 'न वाचलेले',
    chat_read: 'वाचले',
    chat_sent: 'पाठवले',
    chat_attach: 'फाइल जोडा',
    chat_templates: 'जलद उत्तरे',
    chat_add_template: 'टेम्पलेट जोडा',
    chat_no_session: 'कोणताही चॅट सत्र नाही',
    chat_select_patient: 'संभाषण सुरू करण्यासाठी रुग्ण निवडा',
    chat_loading: 'चॅट लोड होत आहे...',

    loading: 'लोड होत आहे...',
    error: 'त्रुटी',
    cancel: 'रद्द करा',
    save: 'जतन करा',
    delete: 'हटवा',
    search: 'शोधा',
    no_data: 'कोणताही डेटा आढळला नाही',
    go_back: 'परत जा',
    new_ai_chat: 'नवीन AI चॅट',
    medical_professional: 'वैद्यकीय व्यावसायिक',
    patient_account: 'रुग्ण खाते',
  },

  gu: {
    app_name: 'DocPlus',
    medical_portal: 'મેડિકલ પોર્ટલ',
    patient_portal: 'દર્દી પોર્ટલ',

    nav_dashboard: 'ડૅશબોર્ડ',
    nav_ai_assistant: 'AI સહાયક',
    nav_patients: 'દર્દીઓ',
    nav_appointments: 'એપોઇન્ટમૅન્ટ',
    nav_prescriptions: 'પ્રિસ્ક્રિપ્શન',
    nav_disease_programs: 'રોગ કાર્યક્રમ',
    nav_clinical_modules: 'ક્લિનિકલ મૉડ્યૂલ',
    nav_ai_support: 'AI સહાય',
    nav_my_doctor: 'મારા ડૉક્ટર',
    nav_my_programs: 'મારા કાર્યક્રમ',
    nav_my_records: 'મારા રેકૉર્ડ',
    nav_settings: 'સેટિંગ',
    nav_help: 'સહાય',
    nav_logout: 'લૉગ આઉટ',

    settings_title: 'સેટિંગ અને પ્રાથમિકતા',
    settings_subtitle: 'તમારો DocPlus અનુભવ કસ્ટમાઇઝ કરો',
    settings_notifications: 'સૂચનાઓ',
    settings_appearance: 'દેખાવ',
    settings_privacy: 'ગોપનીયતા અને સુરક્ષા',
    settings_language: 'ભાષા અને પ્રદેશ',
    save_changes: 'ફેરફારો સાચવો',
    saved: 'સાચવ્યું!',

    chat_no_messages: 'હજી સુધી કોઈ સંદેશ નથી. વાર્તાલાપ શરૂ કરો!',
    chat_placeholder: 'સંદેશ ટાઇપ કરો...',
    chat_send: 'મોકલો',
    chat_doctor: 'ડૉક્ટર',
    chat_patient: 'દર્દી',
    chat_you: 'તમે',
    chat_soap: 'SOAP નોટ બનાવો',
    chat_soap_loading: 'બની રહ્યું છે...',
    chat_unread: 'ન વાંચેલ',
    chat_read: 'વાંચ્યું',
    chat_sent: 'મોકલ્યું',
    chat_attach: 'ફાઇલ જોડો',
    chat_templates: 'ઝડપી જવાબ',
    chat_add_template: 'ટેમ્પ્લેટ ઉમેરો',
    chat_no_session: 'કોઈ ચૅટ સૅશન નથી',
    chat_select_patient: 'વાર્તાલાપ શરૂ કરવા દર્દી પસંદ કરો',
    chat_loading: 'ચૅટ લૉડ થઈ રહ્યી છે...',

    loading: 'લૉડ થઈ રહ્યું છે...',
    error: 'ભૂલ',
    cancel: 'રદ કરો',
    save: 'સાચવો',
    delete: 'ભૂંસો',
    search: 'શોધો',
    no_data: 'કોઈ ડેટા મળ્યો નહીં',
    go_back: 'પાછા જાઓ',
    new_ai_chat: 'નવી AI ચૅટ',
    medical_professional: 'તબીબી વ્યાવસાયિક',
    patient_account: 'દર્દી ખાતું',
  },

  bn: {
    app_name: 'DocPlus',
    medical_portal: 'মেডিকেল পোর্টাল',
    patient_portal: 'রোগী পোর্টাল',

    nav_dashboard: 'ড্যাশবোর্ড',
    nav_ai_assistant: 'AI সহকারী',
    nav_patients: 'রোগীরা',
    nav_appointments: 'অ্যাপয়েন্টমেন্ট',
    nav_prescriptions: 'প্রেসক্রিপশন',
    nav_disease_programs: 'রোগ কার্যক্রম',
    nav_clinical_modules: 'ক্লিনিকাল মডিউল',
    nav_ai_support: 'AI সহায়তা',
    nav_my_doctor: 'আমার ডাক্তার',
    nav_my_programs: 'আমার কার্যক্রম',
    nav_my_records: 'আমার রেকর্ড',
    nav_settings: 'সেটিংস',
    nav_help: 'সাহায্য',
    nav_logout: 'লগ আউট',

    settings_title: 'সেটিংস ও পছন্দ',
    settings_subtitle: 'আপনার DocPlus অভিজ্ঞতা কাস্টমাইজ করুন',
    settings_notifications: 'বিজ্ঞপ্তি',
    settings_appearance: 'চেহারা',
    settings_privacy: 'গোপনীয়তা ও নিরাপত্তা',
    settings_language: 'ভাষা ও অঞ্চল',
    save_changes: 'পরিবর্তন সংরক্ষণ করুন',
    saved: 'সংরক্ষিত!',

    chat_no_messages: 'এখনও কোনো বার্তা নেই। কথোপকথন শুরু করুন!',
    chat_placeholder: 'বার্তা টাইপ করুন...',
    chat_send: 'পাঠান',
    chat_doctor: 'ডাক্তার',
    chat_patient: 'রোগী',
    chat_you: 'আপনি',
    chat_soap: 'SOAP নোট তৈরি করুন',
    chat_soap_loading: 'তৈরি হচ্ছে...',
    chat_unread: 'অপঠিত',
    chat_read: 'পঠিত',
    chat_sent: 'পাঠানো হয়েছে',
    chat_attach: 'ফাইল সংযুক্ত করুন',
    chat_templates: 'দ্রুত উত্তর',
    chat_add_template: 'টেমপ্লেট যোগ করুন',
    chat_no_session: 'কোনো চ্যাট সেশন নেই',
    chat_select_patient: 'কথোপকথন শুরু করতে রোগী নির্বাচন করুন',
    chat_loading: 'চ্যাট লোড হচ্ছে...',

    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ',
    delete: 'মুছুন',
    search: 'খুঁজুন',
    no_data: 'কোনো ডেটা পাওয়া যায়নি',
    go_back: 'ফিরে যান',
    new_ai_chat: 'নতুন AI চ্যাট',
    medical_professional: 'চিকিৎসা পেশাদার',
    patient_account: 'রোগী অ্যাকাউন্ট',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'docplus_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    return stored && TRANSLATIONS[stored] ? stored : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update html lang attribute for accessibility
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: string): string => {
    return TRANSLATIONS[language][key] ?? TRANSLATIONS['en'][key] ?? key;
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
