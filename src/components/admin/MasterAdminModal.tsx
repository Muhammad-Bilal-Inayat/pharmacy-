import React from 'react';
import { MasterServerControlModal } from './MasterServerControlModal';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({ isOpen, onClose }) => {
  return <MasterServerControlModal isOpen={isOpen} onClose={onClose} />;
};
