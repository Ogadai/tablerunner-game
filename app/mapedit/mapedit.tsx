'use client'

import styles from './mapedit.module.css';
import { useSearchParams } from 'next/navigation';
import { cinzel } from '@/app/fonts';
import Image from 'next/image';

export default function MapEdit() {
  const searchParams = useSearchParams();

  const page = searchParams.get('page');
  const singlePage = !!page;
 
  const one = (!page || page === '1');
  const two = (!page || page === '2');

  return (
    <main className={`${styles.host} ${singlePage ? styles.singlePage : styles.doublePage} ${(page === '1') ? styles.pageOne : ''} ${(page === '2') ? styles.pageTwo : ''}`}>
      <Image
        src="/map.png"
        width={1536}
        height={1024}
        className={styles.mapImage}
        loading="eager"
        alt="The map of Couldron of Fire"
      />

      <h3 className={`${cinzel.className} antialiased ${styles.title}`} >Cauldron of Fire</h3>

      <div className={`${styles.gridContainer}`}>
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>240</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>239</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>238</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>237</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>236</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>235</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>234</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>233</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>232</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>231</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>230</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>229</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>228</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>227</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>226</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>225</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>224</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>223</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>222</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>221</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>201</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>202</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>203</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>204</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>205</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>206</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>207</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>208</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>209</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>210</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>211</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>212</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>213</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>214</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>215</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>216</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>217</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>218</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>219</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>220</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>200</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>199</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>198</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>197</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>196</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>195</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>194</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>193</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>192</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>191</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>190</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>189</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>188</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>187</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>186</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>185</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>184</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>183</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>182</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>181</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>161</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>162</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>163</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>164</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>165</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>166</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>167</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>168</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>169</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>170</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>171</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>172</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>173</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>174</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>175</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>176</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>177</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>178</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>179</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>180</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>160</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>159</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>158</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>157</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>156</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>155</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>154</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>153</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>152</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>151</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>150</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>149</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>148</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>147</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>146</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>145</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>144</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>143</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>142</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>141</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>121</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>122</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>123</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>124</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>125</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>126</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>127</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>128</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>129</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>130</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>131</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>132</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>133</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>134</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>135</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>136</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>137</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>138</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>139</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>140</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>120</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>119</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>118</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>117</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>116</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>115</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>114</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>113</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>112</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>111</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>110</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>109</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>108</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>107</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>106</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>105</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>104</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>103</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>102</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>101</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>81</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>82</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>83</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>84</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>85</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>86</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>87</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>88</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>89</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>90</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>91</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>92</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>93</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>94</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>95</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>96</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>97</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>98</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>99</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>100</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>80</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>79</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>78</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>77</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>76</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>75</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>74</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>73</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>72</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>71</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>70</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>69</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>68</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>67</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>66</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>65</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>64</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>63</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>62</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>61</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>41</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>42</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>43</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>44</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>45</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>46</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>47</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>48</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>49</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>50</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>51</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>52</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>53</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>54</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>55</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>56</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>57</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>58</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>59</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>60</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>40</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>39</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>38</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>37</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>36</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>35</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>34</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>33</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>32</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>31</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>30</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>29</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>28</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>27</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>26</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>25</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>24</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>23</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>22</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>21</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>1</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>2</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>3</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>4</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>5</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>6</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>7</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>8</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>9</span></div></div> }
        { one && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>10</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>11</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>12</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>13</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>14</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>15</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>16</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>17</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>18</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>19</span></div></div> }
        { two && <div className={styles.cell}><div className={styles.circle}><span className={styles.number}>20</span></div></div> }
      </div>
    </main>
  );
}
