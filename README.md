# Action Hub

**DSH 鐨勬爣鍑?Agent Skill 搴擄細鍚屼竴浠?`SKILL.md`锛屽彲浠ュ綋妯″瀷鍙皟鐢ㄧ殑 Skill锛屼篃鍙互鍙綋浣犺兘璋冪敤鐨?Command銆?*

[English](README.en.md) 路 [鏇存柊鏃ュ織](CHANGELOG.md) 路 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-6.0.1-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

## 鏍稿績鐞嗗康

- **鏂囦欢鍗虫爣鍑?*锛氭瘡涓潯鐩氨鏄竴涓爣鍑嗙洰褰?`SKILL.md` + 璧勬簮鏂囦欢锛屼笉鐢熸垚 `action.json`锛屼笉寰€ frontmatter 閲屽鎻掍欢绉佹湁瀛楁銆?- **妯″紡鍦ㄦ湰鍦?*锛歚Command` / `Skill` 鏄悓涓€鏂囦欢鐨勪袱绉嶆湰鏈轰娇鐢ㄦ柟寮忥紝鍒囨崲涓嶆敼鏂囦欢銆佷笉澶嶅埗姝ｆ枃銆?- **Command 闆朵笂涓嬫枃**锛氶粯璁や笉娉ㄥ唽缁欐ā鍨嬶紝鍙湪 Action 闈㈡澘閲岀敱浣犱富鍔ㄨ皟鐢ㄣ€?- **Skill 鍙妯″瀷璋冪敤**锛氬彧鏈変綘鏄惧紡鍒囨崲鍚庢墠浼氳繘鍏ユā鍨嬬洰褰曪紱鍒囨崲浼氭樉绀轰笂涓嬫枃鎴愭湰銆?- **椤圭洰鑼冨洿**锛氭瘡涓潯鐩彲浠ュ彧鍏佽鍦ㄦ寚瀹氶」鐩娇鐢紱鑼冨洿瀛樻湰鍦帮紝涓嶉殢鍒嗕韩鍖呰蛋銆?- **瀵煎叆闆惰浆鎹?*锛氱綉涓婁笅杞界殑 SKILL.md 鐩綍/ZIP 鍘熸牱瀵煎叆锛屽鍑轰篃鏄師鏍锋爣鍑嗙洰褰曘€?
## 浣跨敤

### 闈㈡澘

`Alt + A`锛坢acOS `鈱?+ A`锛夋垨杈撳叆妗嗗伐鍏疯鎸夐挳鎵撳紑锛?
- 涓枃鍚嶃€佹弿杩般€佹爣绛俱€佹鏂囧潎鍙悳绱紱
- 姣忚鏄剧ず `[Command]` / `[Skill]` 涓庤寖鍥达紱
- Command锛氭棤鍙傛暟鎻掑叆寮曠敤 chip锛屾湁鍙傛暟鎻掑叆灞曞紑鍚庣殑姝ｆ枃锛?- Skill锛氭彃鍏?`/skill-name`锛岀敱 DSH 鍘熺敓鍔犺浇鎶€鑳芥鏂囷紱
- `Enter` / `Tab` 鎻掑叆锛宍Ctrl/鈱?+ Enter` 鍙戦€併€?
### 绠＄悊

`Ctrl + Alt + A`锛坢acOS `鈱?+ 鈱?+ A`锛夋垨绠＄悊椤碉細

- 鏂板缓/缂栬緫鏍囧噯鎶€鑳斤紙`name` 蹇呴』鏄?kebab-case锛夛紱
- 鍒囨崲 Command / Skill锛?- 閰嶇疆鈥滄墍鏈夐」鐩€濇垨鍕鹃€夋寚瀹氶」鐩紱
- 瀵煎叆鏂囦欢澶?ZIP锛屽鍑哄崟鏉℃垨鏁村簱銆?
### 瀵煎叆浠绘剰鏍囧噯 Skill

瀵煎叆鐩綍蹇呴』鍖呭惈 `SKILL.md`锛?
```text
my-skill/
  SKILL.md
  ...璧勬簮鏂囦欢
```

```markdown
---
name: my-skill
description: 涓€鍙ヨ瘽璇存槑浣曟椂浣跨敤
---

姝ｆ枃鈥︹€?```

瀵煎叆鍚庨粯璁ゆ槸 **Command**銆傞渶瑕佸湪缂栬緫鍣ㄩ噷鍒囨崲涓?**Skill**锛屾ā鍨嬫墠鑳借嚜琛岃皟鐢紱鍒囨崲鍓嶄細鎻愮ず涓婁笅鏂囨垚鏈€?
## 鏁版嵁

```text
~/.dsh/dsh-action-hub/
  library/<skill-name>/
    SKILL.md       # 鍞竴浜嬪疄婧愶紝鏍囧噯鏍煎紡
    ...璧勬簮
  state.json       # 鏈満鐘舵€侊細mode / scope / category / pin / usage
```

- 涓嶅垱寤?`action.json`锛?- 鍗囩骇鑷?5.x 鏃讹紝鏃?`actions/` 浼氬綊妗ｅ埌 `backup-v5-test-*`锛屾柊搴撲负绌猴紝涓嶅仛鍏煎杩佺Щ锛?- 鍒嗕韩鍖呭彧鍖呭惈鏍囧噯鎶€鑳界洰褰曪紝涓嶅寘鍚?`state.json`锛屽洜姝ゆā寮?鑼冨洿/鍒嗙被涓嶄細闅忓寘鍒嗕韩銆?
## 椤圭洰鑼冨洿

- 鑼冨洿鍙仛鍏ㄥ眬 + 椤圭洰绾э紱
- 椤圭洰鏉ユ簮鏄?DSH 宸茬櫥璁板伐浣滃尯锛屼笉鎵嬭緭璺緞锛?- 鑼冨洿鍦?provider 鍜?Command 娉ㄥ叆鐐瑰悇鏍￠獙涓€娆★紱
- 鏈煡椤圭洰/scope 鎹熷潖鏃堕粯璁や笉鍙敤锛坒ail-closed锛夈€?
## 寮€鍙?
```bash
npm install
npm test
```

瀹㈡埛绔敱 `src/client/*.js` 鎷兼帴涓?`client.js`锛汬ost 鍏ュ彛 `index.js`锛屾爣鍑嗘枃妗ｈВ鏋愬湪 `skill-doc.js`銆?
## 闄愬埗

- 鍘熺敓 `/` 鑿滃崟鎸?ASCII name 鎼滅储锛屼腑鏂囨悳绱㈣鐢?Action 闈㈡澘锛?- Skill 鐩綍鍙樺寲浼氳妯″瀷鐩綍鏁翠綋閲嶅彂涓€娆★紱鍒囨崲鍓嶈鐣欐剰鎴愭湰鎻愮ず锛?- 褰撳墠鐗堟湰涓嶆彁渚?agent/preset 绾ц寖鍥淬€?
