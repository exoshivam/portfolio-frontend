// The icons a skill can use. Brand logos are large SVGs, so this module is loaded on demand
// (see useSkillIcons) instead of being part of the first page load.
import { Brain, Code2, Cpu, Database, FileCode2, Globe, Layers, Link2, Rocket, Server, Smartphone, Sparkles, Terminal, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { FaJava } from 'react-icons/fa';
import {
  SiAmazonwebservices, SiAndroid, SiApachekafka, SiArduino, SiC, SiCplusplus, SiCss3, SiDjango, SiDocker, SiEspressif,
  SiExpress, SiFastapi, SiFigma, SiFirebase, SiFlask, SiFlutter, SiGit, SiGithub, SiGo, SiGooglecloud, SiGraphql,
  SiHtml5, SiHuggingface, SiJavascript, SiKotlin, SiKubernetes, SiLangchain, SiLinux, SiMongodb, SiMysql, SiNestjs,
  SiNextdotjs, SiNginx, SiNodedotjs, SiNumpy, SiOpenai, SiPandas, SiPostgresql, SiPostman, SiPrisma, SiPython,
  SiPytorch, SiRaspberrypi, SiReact, SiRedis, SiRedux, SiRust, SiSocketdotio, SiSpringboot, SiSupabase, SiSwift,
  SiTailwindcss, SiTensorflow, SiTypescript, SiVercel, SiVite,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

export const SKILL_ICONS: Record<string, LucideIcon | IconType> = {
  SiReact, SiNodedotjs, SiTypescript, SiJavascript, SiPython, SiGo, SiRust, SiCplusplus, SiC, FaJava, SiKotlin, SiSwift,
  SiHtml5, SiCss3, SiTailwindcss, SiNextdotjs, SiRedux, SiVite, SiExpress, SiNestjs, SiFastapi, SiDjango, SiFlask,
  SiSpringboot, SiGraphql, SiSocketdotio, SiMongodb, SiPostgresql, SiMysql, SiRedis, SiPrisma, SiSupabase, SiFirebase,
  SiDocker, SiKubernetes, SiNginx, SiApachekafka, SiAmazonwebservices, SiGooglecloud, SiVercel, SiLinux, SiGit,
  SiGithub, SiPostman, SiFigma, SiFlutter, SiAndroid, SiOpenai, SiLangchain, SiHuggingface, SiPytorch, SiTensorflow,
  SiNumpy, SiPandas, SiArduino, SiEspressif, SiRaspberrypi,
  Code2, Terminal, Server, Database, Cpu, Brain, Sparkles, Zap, Rocket, Link2, FileCode2, Layers, Globe, Smartphone, Wrench,
  // legacy names already stored in the seed data
  React: SiReact,
  FaBeer: SiReact,
};

/** Readable label for the icon picker: "SiNodedotjs" -> "Nodedotjs". */
export const iconLabel = (name: string) => name.replace(/^(Si|Fa)(?=[A-Z])/, '');

export const PICKER_ICONS = Object.keys(SKILL_ICONS).filter((n) => n !== 'React' && n !== 'FaBeer');

