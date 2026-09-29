import type { Kernel } from '@lib/kernel';
import { useKernel } from './KernelProvider';

export type ServiceFactory<Service> = (kernel: Kernel) => Service;

const services = new WeakMap<Kernel, Map<ServiceFactory<unknown>, unknown>>();

export function serviceOf<Service>(kernel: Kernel, create: ServiceFactory<Service>): Service {
  let created = services.get(kernel);
  if (created === undefined) {
    created = new Map();
    services.set(kernel, created);
  }
  if (!created.has(create)) {
    created.set(create, create(kernel));
  }
  return created.get(create) as Service;
}

export function useService<Service>(create: ServiceFactory<Service>): Service {
  return serviceOf(useKernel(), create);
}
