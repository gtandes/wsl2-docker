import React from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";
import { CategoriesLayout } from "../../../components/categories/CategoriesLayout";
import { CategoriesView } from "../../../components/categories/CategoriesView";

const Questions = () => {
  return (
    <AdminLayout>
      <CategoriesLayout>
        <CategoriesView type="policy" />
      </CategoriesLayout>
    </AdminLayout>
  );
};

export default withAuth(Questions, AdminGroup);
