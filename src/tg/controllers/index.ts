import { Controller } from './base';
import { controllers, globalCtrlConfig, GlobalCtrlConfig } from './enum';

export type ControllerName = keyof typeof controllers;

export function loadControllers(conf: GlobalCtrlConfig = globalCtrlConfig) {
  const obj: Record<string, Controller> = {};
  Object.keys(controllers).forEach((el) => {
    obj[el] = new controllers[el as ControllerName](conf);
  });
  return obj as Record<ControllerName, Controller>;
}

export { GlobalCtrlConfig, globalCtrlConfig };
