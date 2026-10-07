import React from 'react';
import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth/AuthContext';

const PrivateRoute = ({ administratorOnly = false }: { administratorOnly?: boolean }) => {
  const { status, isAdministrator } = useAuth();

  if (status === 'loading') {
    return (
      <Center mih="50vh">
        <Loader aria-label="Checking your session" />
      </Center>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return administratorOnly && !isAdministrator ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

export default PrivateRoute;
