import React from 'react';
import { View, Text } from 'react-native';
import usePermission from '@/hooks/usePermission';

type Props = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

export const RequireMember: React.FC<Props> = ({ children, fallback = null }) => {
    const { loading, isMember } = usePermission();

    if (loading) return null; // or a spinner if desired

    return <>{isMember() ? children : fallback}</>;
};

export default RequireMember;
