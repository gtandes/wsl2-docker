import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import React from "react";
import { QuestionsList } from "../../../components/exams/QuestionsList";
import Tabs from "../../../components/Tabs";
import { getExamTabs } from "../../../components/exams/tabs";
import { useAuth } from "../../../hooks/useAuth";

function QuestionsListPage() {
  const auth = useAuth();
  const isAdmin = AdminEditRoles.includes(auth.currentUser?.role!);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-800 sm:mb-12">
        Questions
      </h1>
      <Tabs tabs={getExamTabs(isAdmin)} />
      <QuestionsList />
    </AdminLayout>
  );
}

export default withAuth(QuestionsListPage, AdminGroup);
